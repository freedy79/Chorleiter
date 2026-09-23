# Plan: MCP-Server & Chor-API-Tokens

> Ziel: Ein Chorverwalter kann einen API-Token für **seinen** Chor erzeugen. Damit kann ein
> MCP-Client (z. B. ChatGPT) lesend auf Termine, Repertoire, Suche und Dienstplan zugreifen –
> mit den Rechten eines Chorverwalters, aber **ohne Zugriff auf personenbezogene Daten
> jenseits des Anzeigenamens**.

Status: Planungsdokument (noch keine Implementierung)

---

## 1. Leitprinzipien

| # | Prinzip | Umsetzung |
|---|---------|-----------|
| P1 | **Strikte Mandantentrennung** | `choirId` kommt ausschließlich aus dem Token, niemals aus Query/Body. Jede Query erzwingt `where: { choirId: req.apiToken.choirId }`. |
| P2 | **Read-only by default, Schreiben nur explizit** | Ein Token ist ohne den Scope `events:write` rein lesend. Schreiben ist auf einen einzigen, eng umrissenen Anwendungsfall begrenzt (Stückliste eines Termins) und nur für Tokens, die von einem `director` erstellt wurden. |
| P3 | **Datensparsamkeit als Code, nicht als Konvention** | Eigene Serializer-Schicht (Allowlist). Sequelize-Instanzen verlassen den MCP-Layer nie direkt. |
| P4 | **Getrennter Auth-Pfad** | API-Token funktionieren *nur* unter `/mcp`. Ein API-Token ist kein JWT und kann keine bestehende REST-Route aufrufen. |
| P5 | **Kein Geheimnis in der DB** | Nur SHA-256-Hash des Tokens wird gespeichert, Klartext genau einmal angezeigt. |
| P6 | **Nachvollziehbarkeit** | Jeder Tool-Aufruf wird mit Token-ID, Tool, Parametern (gekürzt) und IP protokolliert. |

---

## 2. Datenmodell

### 2.1 Neues Modell `choir_api_token`
Datei: `choir-app-backend/src/models/choir_api_token.model.js`

| Feld | Typ | Bemerkung |
|------|-----|-----------|
| `id` | UUID PK | |
| `choirId` | FK → `choir` | Mandantenbindung, **immutable** |
| `createdByUserId` | FK → `user` | Chorverwalter, der den Token erzeugt hat |
| `label` | STRING | z. B. „ChatGPT Arbeitsplatz Müller" |
| `tokenHash` | STRING(64), unique | `sha256(token)` – **kein Klartext** |
| `tokenPrefix` | STRING(12) | z. B. `ckm_a1b2c3` zur Wiedererkennung in der UI |
| `scopes` | JSON (Array) | `['events:read','repertoire:read','search:read','plan:read','stats:read','events:write']` |
| `allowWrite` | BOOLEAN default false | Redundanter Hard-Switch zusätzlich zum Scope (Defense in Depth) |
| `expiresAt` | DATE | max. `now + 90 Tage` (DB-seitig via Hook geprüft) |
| `lastUsedAt` | DATE nullable | |
| `lastUsedIp` | STRING nullable | |
| `usageCount` | INTEGER default 0 | |
| `renewedAt` / `renewCount` | DATE / INTEGER | Audit der Verlängerungen |
| `expiryNotifiedAt` | DATE nullable | Idempotenz für die 7-Tage-Mail |
| `revokedAt` / `revokedByUserId` | DATE / FK | Soft-Revoke statt Löschen (Audit) |

Indizes: `tokenHash` (unique), `choirId`, `expiresAt`.

### 2.2 Optional `choir_api_token_usage` (Phase 3)
Schlankes Audit-Log (`tokenId`, `tool`, `paramsDigest`, `ip`, `durationMs`, `resultCount`, `createdAt`),
Retention 90 Tage, Aufräum-Job im bestehenden `archive-logs`-Muster.

### 2.3 Migration
Gemäß [doc/backend/DATABASE-MIGRATION-RULES.md](../backend/DATABASE-MIGRATION-RULES.md):
neue Datei `src/init/ensureChoirApiTokenTables.js`, **kein** `sync({ alter: true })`.
Unique-Constraint über `indexes: [{ unique: true, fields: ['tokenHash'] }]`.

---

## 3. Token-Lebenszyklus

### 3.1 Format
```
ckm_<8 Zeichen base32 choir-scope>_<43 Zeichen base64url aus 32 Byte crypto.randomBytes>
```
Prefix `ckm_` erlaubt Secret-Scanning; die ersten 12 Zeichen werden als `tokenPrefix` gespeichert.

### 3.2 Endpunkte
Neue Routen `src/routes/choirApiToken.routes.js`, gemountet unter `/api/choir-api-tokens`,
Middleware-Kette: `verifyToken` → `requireChoirAdmin` (bzw. `requireDirectorOrHigher`).

| Methode | Pfad | Zweck |
|---------|------|-------|
| `GET` | `/` | Tokens des aktiven Chors (ohne Secret) |
| `POST` | `/` | Erzeugen; Body: `label`, `scopes`, `validDays` (1–90). Antwort enthält **einmalig** den Klartext |
| `POST` | `/:id/renew` | `expiresAt = now + validDays (max 90)`, setzt `expiryNotifiedAt = null`. Secret bleibt gleich |
| `POST` | `/:id/rotate` | Neues Secret, alter Hash sofort ungültig |
| `DELETE` | `/:id` | Revoke (`revokedAt` setzen) |

Limits: max. 5 aktive Tokens pro Chor; eigener `express-rate-limit` (10/h) auf `POST /` und `/rotate`.

### 3.3 Ablauf-Benachrichtigung (7 Tage vorher)
- Neuer Service `src/services/apiTokenExpiryNotifier.service.js` nach dem Muster von
  `dutyReminder.service.js` (`setInterval`, Intervall über `API_TOKEN_EXPIRY_CHECK_INTERVAL_MS`,
  Vorlaufzeit über `API_TOKEN_EXPIRY_WARN_DAYS`, Default 7).
- Auswahl: `revokedAt IS NULL AND expiryNotifiedAt IS NULL AND expiresAt BETWEEN now AND now+7d`.
- Versand via `sendTemplateMail('api-token-expiry', …)` an `createdByUserId`, Fallback: alle
  `choir_admin` des Chors.
- Neuer Seed-Eintrag im `mail_template`-Model, Typ `api-token-expiry`, Platzhalter
  `{{label}}`, `{{tokenPrefix}}`, `{{expiresAt}}`, `{{choirName}}`, `{{renewUrl}}`.
- Zweite Mail direkt nach Ablauf (Typ `api-token-expired`) ist optional (Phase 3).

---

## 4. Authentifizierung des MCP-Zugriffs

Neue Datei `src/middleware/apiToken.middleware.js`:

```
verifyChoirApiToken:
  1. Bearer-Token aus Authorization-Header lesen (nur Header, nie Query)
  2. sha256 → Lookup über tokenHash (konstantzeitiger Vergleich nicht nötig, da Hash-Index)
  3. Prüfen: revokedAt == null, expiresAt > now
  4. Prüfen: Chor existiert, ist nicht Demo-Chor, Modul aktiv
  5. Setzen: req.apiToken = { id, choirId, scopes }
             req.activeChoirId = token.choirId
             req.userId = null           // bewusst: keine Nutzeridentität
             req.userRoles = ['api']
  6. lastUsedAt / usageCount asynchron aktualisieren (throttled, max 1×/min)
  7. runWithRequestContext({ apiTokenId, choirId })
```

**Wichtig:** `verifyToken` (JWT) und `verifyChoirApiToken` bleiben getrennt. Der MCP-Router
akzeptiert **ausschließlich** API-Tokens; die bestehenden `/api/*`-Routen akzeptieren
**ausschließlich** JWTs. Damit ist ausgeschlossen, dass ein API-Token versehentlich eine
Schreib-Route erreicht.

`requireScope('events:read')` als kleine Zusatz-Middleware pro Tool.

Eigener Rate-Limiter: 60 Requests/Minute und 5.000/Tag **pro Token** (Key = `tokenId`).

---

## 5. Datensparsamkeit: Serializer-Schicht

Neue Datei `src/services/mcp/mcpSerializers.js`. **Nur** diese Funktionen erzeugen MCP-Ausgaben.

```
serializeEvent(event)      → { id, date, type, notes, director: Person|null,
                               organist: Person|null, pieces: [PieceRef] }
serializePerson(user)      → { ref: hmac(userId), displayName: "Vorname Nachname" }
serializeRepertoireItem()  → { pieceId, title, subtitle, voicing, key, durationSec,
                               composers[], authors[], arrangers[], collections[],
                               status, rating, notes,
                               lastSung, lastRehearsed, timesSung, timesRehearsed }
serializePiece()           → wie oben + lyrics (nur wenn Scope `repertoire:read`)
serializePlanEntry()       → { date, eventType, notes, director: Person|null,
                               organist: Person|null }
```

`Person.ref` = `HMAC-SHA256(userId, MCP_PERSON_REF_SECRET)`, gekürzt auf 16 Zeichen:
stabil über Requests hinweg (für Korrelation im Modell), aber nicht auf die User-ID rückführbar.

**Explizit ausgeschlossen (Deny-List, durch Test abgesichert):**
`email`, `phone`, `password`, `roles`, `rolesInChoir`, `resetToken`, `pendingEmail`,
`deletionRequestedAt`, `joinHash`, `shareToken`, sowie komplett die Entitäten
`user_availability`, `chat_room`, `chat_message`, `poll_vote`, `search_history`,
`lending`, `practice_list*`, `post_comment`, `one_time_token`, `data_enrichment_setting`.

> Damit ist die Anforderung „kein Zugriff auf Benutzerdaten außer dem Namen" erfüllt –
> insbesondere zeigt der Dienstplan **wer** eingeteilt ist, aber nicht **wer wann verfügbar** ist.

---

## 6. MCP-Server

### 6.1 Variante A (empfohlen): In-Process unter `/api/mcp`
- Paket `@modelcontextprotocol/sdk`, Transport **Streamable HTTP** (`StreamableHTTPServerTransport`).
- Neue Dateien:
  - `src/mcp/server.js` – Server-Factory, Tool-Registrierung
  - `src/mcp/tools/*.js` – je ein Tool
  - `src/routes/mcp.routes.js` – mountet `/api/mcp` mit `verifyChoirApiToken` + Rate-Limiter
- **Wichtig:** Der Reverse-Proxy in Produktion leitet nur `/api/*` an Node weiter; alles andere
  wird als Angular-SPA ausgeliefert. Deshalb ist `/api/mcp` die produktive Adresse. `/mcp` bleibt
  zusätzlich gemountet für Setups, die es direkt proxen. `/api/mcp` ist von der CSRF-Prüfung und
  vom globalen IP-Rate-Limiter ausgenommen, da es per Bearer-Token authentifiziert und per Token
  gedrosselt wird.
- Vorteil: kein zweiter Deploy-Artefakt, gleiche DB-Session, direkte Wiederverwendung der
  bestehenden Controller-Services.

### 6.2 Variante B (ergänzend): stdio-Proxy
Kleines npm-Paket `mcp-server/` (eigenes `package.json`), das per stdio läuft und die
`/mcp`-HTTP-Schnittstelle mit `CHORLEITER_API_TOKEN` aus der Umgebung aufruft.
Nötig für Claude Desktop / lokale Clients ohne Remote-MCP-Support.

### 6.3 Tool-Katalog (Phase 1)

| Tool | Parameter | Scope | Beschreibung |
|------|-----------|-------|--------------|
| `get_choir_info` | – | – | Name, Ort, aktive Module, Anzahl Repertoirestücke |
| `list_upcoming_events` | `from?`, `to?`, `type?` (`REHEARSAL`\|`SERVICE`), `limit` (≤50) | `events:read` | Nächste Termine inkl. Programm-Stücke, Leitung, Organist |
| `get_event` | `eventId` | `events:read` | Einzeltermin mit Stückliste |
| `list_repertoire` | `status?`, `voicing?`, `minRating?`, `query?`, `limit`, `cursor?` | `repertoire:read` | Was der Chor singen kann |
| `search` | `query`, `scope?` (`all`\|`title`\|`lyrics`\|`person`\|`collection`), `limit` | `search:read` | Einheitliche Suche; Wrapper um `search.controller` mit erzwungenem `choirId` |
| `fetch` | `id` (`piece:…`\|`event:…`\|`collection:…`) | – | Volldetails zu einem Suchtreffer (Pflicht-Tool für ChatGPT Deep Research) |
| `get_service_plan` | `year`, `month` | `plan:read` | Dienstplan-Einträge: Datum, Anlass, musikalische Leitung, Orgel |
| `get_next_duties` | `limit` (≤20) | `plan:read` | Kommende Dienste über Monatsgrenzen hinweg |
| `get_last_event` | `type` (`REHEARSAL`\|`SERVICE`), `before?` | `events:read` | „Was war in der letzten Probe / im letzten Gottesdienst?" – Datum, Notizen, Leitung, komplette Stückliste |
| `list_recent_events` | `type?`, `limit` (≤20) | `events:read` | Rückblick über die letzten n Termine inkl. Stücken |
| `get_piece_history` | `pieceId` \| `title` | `stats:read` | Pro Stück: `lastSung`, `lastRehearsed`, `timesSung`, `timesRehearsed` + letzte Aufführungen mit Datum und Anlass |
| `get_repertoire_stats` | `from?`, `to?`, `limit` | `stats:read` | Top-/Flop-Listen: häufigste Gottesdienst- und Probenstücke, seit >12 Monaten ungesungene Stücke, Anzahl singbar / in Probe |
| `suggest_pieces` | `count` (≤10), `status?`, `notSungSinceMonths?` | `stats:read` | Vorschläge für die nächste Probe: singbare Stücke, die am längsten nicht dran waren |

`search` + `fetch` sind bewusst genau so benannt, weil ChatGPT-Connectors diese beiden Tools
für den Deep-Research-Modus voraussetzen.

**Suchdetails:** Titelsuche → `piece.title`/`subtitle`; Textsuche → `piece.lyrics`;
Interpreten-/Personensuche → `composer.name`, `author.name`, `piece_arranger`.
Wiederverwendung der Dialekt-Behandlung (`ILIKE` vs. `LIKE`) aus `search.controller.js`;
ggf. Extraktion in `src/services/search.service.js`, damit REST und MCP dieselbe Logik nutzen.

**Statistik-Quellen (Wiederverwendung statt Neuimplementierung):**
- `lastSung` / `lastRehearsed` / `timesSung` / `timesRehearsed`: vorhandene Subqueries in
  [choir-app-backend/src/controllers/repertoire.controller.js](../../choir-app-backend/src/controllers/repertoire.controller.js#L57) –
  vorab nach `src/services/repertoireStats.service.js` extrahieren, damit REST und MCP dieselbe
  Logik nutzen. `validateChoirId()` bleibt zwingend (SQL-Injection-Schutz bei `literal`).
- Top-/Flop-Listen und Zählwerte: [choir-app-backend/src/controllers/stats.controller.js](../../choir-app-backend/src/controllers/stats.controller.js) –
  Extraktion nach `src/services/stats.service.js`. **Der `global=true`-Pfad (choirübergreifende
  Statistik) wird für MCP hart deaktiviert.**

**Ergebnis-Budget:** jede Tool-Antwort max. 50 Datensätze / ~30 kB, Cursor-Pagination,
`truncated: true` im Ergebnis. Verhindert Kontext-Überlauf und Massenexport.

---

## 6a. Schreibzugriff: Liederliste setzen

> Anforderung: Der Chorleiter will über ChatGPT die Liste der gesungenen/geprobten Stücke
> eines Termins pflegen. Das ist der **einzige** Schreibvorgang in Phase 1.

### Tools

| Tool | Parameter | Scope | Verhalten |
|------|-----------|-------|-----------|
| `resolve_pieces` | `titles[]` (≤30) | `repertoire:read` | Pflicht-Vorstufe: mappt Titeltexte auf konkrete `pieceId`s aus dem Chor-Repertoire; bei Mehrdeutigkeit `candidates[]` statt einer Auswahl |
| `prepare_event_pieces` | `eventId?`, `date?`, `type`, `pieceIds[]`, `mode` (`replace`\|`append`) | `events:write` | **Ändert nichts.** Liefert Vorschau (vorher/nachher, Diff) plus `confirmationToken` (5 min gültig, gebunden an Token-ID + Payload-Hash) |
| `commit_event_pieces` | `confirmationToken` | `events:write` | Führt die Änderung genau einmal aus (Idempotenz über den Token) und liefert das Ergebnis |

**Zwei-Stufen-Prinzip:** Ein LLM kann nie direkt schreiben. Es muss erst eine Vorschau anfordern,
deren Diff im Chatverlauf sichtbar wird, und dann bestätigen. Der `confirmationToken` ist an den
exakten Payload-Hash gebunden – ein abweichender Commit schlägt fehl.

### Regeln
- Nur Termine des eigenen Chors, nur `finalized = false`.
- Kein Anlegen/Löschen von Terminen; keine Änderung von `directorId`, `organistId`, `date`, `notes`.
- `pieceIds` müssen im `choir_repertoire` des Chors existieren (sonst `400` mit Kandidatenliste).
- Optimistic Locking über das vorhandene `event.version` → bei Konflikt `409` mit aktuellem Stand.
- Wiederverwendung von `autoUpdatePieceStatuses()` und `syncLinkedPlanEntryFromEvent()` aus
  [choir-app-backend/src/controllers/event.controller.js](../../choir-app-backend/src/controllers/event.controller.js),
  damit Repertoire-Status und Dienstplan konsistent bleiben.
- Write-Quota: max. 20 Commits pro Token und Tag.
- Jede Änderung landet mit Vorher-/Nachher-Stückliste im Usage-Log und ist in der Token-Verwaltung einsehbar.
- Optional (Phase 6): E-Mail an den Token-Ersteller bei jedem Commit.

---

## 7. Frontend (Angular)

- Neue Seite `features/choir-management/api-tokens/` (Route nur für `choir_admin`/`director`).
- Tabelle: Label, Prefix, Scopes, Ablaufdatum (mit Warn-Chip < 7 Tage), letzte Nutzung, Aktionen.
- Warn-Icon in der Tabelle für Tokens mit `events:write`.
- Dialog „Token erstellen": Label, Scope-Auswahl (Checkboxen), Laufzeit-Slider 7/30/60/90 Tage.
  `events:write` ist separat abgesetzt, standardmäßig aus, nur für `director` wählbar und
  verlangt eine zusätzliche Bestätigungs-Checkbox.
- Detailansicht je Token: letzte 50 Aufrufe (Tool, Zeit, IP) und alle Schreibvorgänge mit Diff.
- Ergebnis-Dialog mit Copy-Button und deutlichem Hinweis „wird nur einmal angezeigt".
- Setup-Hilfe: fertiger JSON-Schnipsel für ChatGPT-/Claude-Konfiguration.
- Neuer Service `core/services/choir-api-token.service.ts` (erweitert das bestehende Service-Muster).
- Styling gemäß [.github/agents/ui-ux-instructions.md](../../.github/agents/ui-ux-instructions.md);
  Breakpoint-/Dark-Mode-Mixins verwenden, kein Hardcoding.

---

## 8. Risiken & Gegenmaßnahmen

| # | Risiko | Gegenmaßnahme |
|---|--------|---------------|
| R1 | **Token-Leak** (Chat-Historie, Screenshot, LLM-Provider-Logs) | Nur Hash in DB; max. 90 Tage; Sofort-Revoke + Rotate in der UI; `lastUsedIp`/`lastUsedAt` sichtbar, damit Missbrauch auffällt; optionale IP-Allowlist pro Token (Phase 3); Prefix `ckm_` für Secret-Scanner |
| R2 | **Cross-Tenant-Zugriff** | `choirId` niemals aus Request; zentraler Helper `scopedWhere(req, extra)`; automatisierter Test, der jedes Tool mit zwei Chören prüft |
| R3 | **PII-Leak über Relationen** (z. B. `include: user`) | Allowlist-Serializer; Unit-Test, der jede Tool-Antwort rekursiv nach verbotenen Feldnamen und nach `@`-Zeichen durchsucht |
| R4 | **Rückschluss auf Verfügbarkeiten/Gesundheitsdaten** | `user_availability` ist komplett gesperrt; `get_service_plan` liefert nur finalisierte Einteilungen |
| R5 | **Prompt Injection** über Freitextfelder (`notes`, `lyrics`, Post-Texte) | Serializer entfernt Markdown-Links/HTML und kappt auf n Zeichen; jede Tool-Antwort wird mit `"untrusted_content": true` markiert; Posts/Chat sind gar nicht exponiert |
| R6 | **Massenabzug des Repertoires** | Seiten-Limits, Tages-Quota pro Token, Usage-Log + Alarm bei > X Requests/Tag |
| R7 | **Rechteausweitung** (API-Token trifft Schreib-Route) | Vollständig getrennte Middleware-Pfade; MCP-Router lehnt `POST/PUT/PATCH/DELETE` außerhalb des MCP-Protokolls ab; Test, der ein API-Token gegen `/api/events` wirft und 401 erwartet |
| R8 | **DoS / Kostenexplosion** | Eigener Rate-Limiter pro Token zusätzlich zum globalen Limiter; DB-Query-Timeouts; `limit`-Parameter serverseitig gekappt |
| R9 | **Ex-Chorverwalter behält Zugriff** | Beim Entzug der `choir_admin`/`director`-Rolle bzw. Entfernen aus dem Chor werden alle von ihm erstellten Tokens automatisch revoked (Hook in der Choir-Management-Logik) |
| R10 | **ChatGPT-Connector unterstützt keinen statischen Bearer-Token** | **Umgesetzt:** OAuth-2.1-Fassade unter `/api/oauth` mit Dynamic Client Registration (RFC 7591), Authorization Code + PKCE-S256 und rotierenden Refresh-Tokens. Der ausgestellte Access-Token *ist* ein regulärer Chor-API-Token, sodass alle bestehenden Kontrollen greifen. Discovery läuft über den `WWW-Authenticate`-Header auf `/api/oauth/.well-known/oauth-protected-resource`. **Kein** Token im URL-Pfad |
| R11 | **Token im Klartext geloggt** | Winston-Redaction für `authorization`-Header; `paramsDigest` statt Rohparameter im Usage-Log |
| R12 | **Stale Cache liefert Daten anderer Chöre** | MCP nutzt den `monthlyPlanCache` mit demselben Key-Schema `choirId:year:month`; Test dafür |
| R13 | **DSGVO/Auftragsverarbeitung** | Einwilligungs-Checkbox im Erstell-Dialog („Daten werden an einen externen KI-Dienst übertragen"); Hinweis in der Datenschutzerklärung; Admin-Übersicht aller aktiven Tokens systemweit |
| R14 | **LLM schreibt halluzinierte Stücke in einen Termin** | `resolve_pieces` als Pflicht-Vorstufe (nur echte `pieceId`s aus dem Chor-Repertoire); Zwei-Stufen-Commit mit sichtbarem Diff; `mode: replace` zeigt entfernte Titel in der Vorschau explizit |
| R15 | **Doppelte Ausführung / Retry des Clients** | `confirmationToken` ist Single-Use und an den Payload-Hash gebunden; Idempotenz-Datensatz bleibt 24 h bestehen |
| R16 | **Race gegen die Weboberfläche** | Optimistic Locking über `event.version`; bei Konflikt `409` statt Überschreiben |
| R17 | **Schreibrechte als Einfallstor** | `events:write` ist opt-in, nur für `director`, zusätzliches `allowWrite`-Flag in der DB, eigene Tagesquota, eigener Audit-Trail, global abschaltbar über `MCP_WRITE_ENABLED=false` |
| R18 | **Statistik-Leak über Chorgrenzen** | Der `global=true`-Pfad aus `stats.controller.js` wird im MCP-Layer hart auf `false` gesetzt; Test dafür |
| R19 | **SQL-Injection über `literal()`-Subqueries** | `validateChoirId()` bleibt verbindlich; Statistik-Subqueries erhalten die `choirId` ausschließlich aus dem Token, nie aus Tool-Parametern |
| R20 | **Offener Redirector über `redirect_uri`** | `redirect_uri` muss exakt einem bei der Registrierung hinterlegten Wert entsprechen; nur `https` oder `http` auf Loopback; bei Abweichung wird **nicht** redirected, sondern ein Fehler gerendert |
| R21 | **Abgefangener Authorization Code** | PKCE mit S256 ist Pflicht (`plain` wird abgelehnt), Code ist 10 Minuten gültig und Single-Use; ein Replay widerruft genau den daraus entstandenen Grant |
| R22 | **Gestohlener Refresh-Token** | Refresh-Tokens rotieren bei jeder Nutzung; die Wiederverwendung eines bereits rotierten Tokens widerruft sofort den gesamten Grant inklusive Access-Token |
| R23 | **Fremdes Chor-Grant über die Consent-Seite** | Die Entscheidung läuft über die Session des Webclients; der Server prüft erneut, dass der Nutzer `choir_admin`/`director` im gewählten Chor ist. `POST /api/oauth/authorize` bleibt CSRF-geschützt |

---

## 9. Tests

Nach bestehendem Muster (`tests/*.controller.test.js`, In-Memory-SQLite, plain `assert`):

- `tests/choirApiToken.controller.test.js` – Erstellen, 90-Tage-Cap, Renew, Revoke, Rollenprüfung, Max-Anzahl
- `tests/apiToken.middleware.test.js` – abgelaufen / revoked / unbekannt / falscher Chor
- `tests/mcp.isolation.test.js` – zwei Chöre, jedes Tool darf nur eigene Daten liefern
- `tests/mcp.pii.test.js` – rekursiver Scan aller Tool-Antworten auf Deny-List-Felder und E-Mail-Muster
- `tests/mcp.tools.test.js` – Vertragstests je Tool (Schema, Limits, Pagination)
- `tests/mcp.stats.test.js` – `lastSung`/`timesSung` gegen bekannte Fixtures, `global`-Pfad gesperrt
- `tests/mcp.write.test.js` – Vorschau ändert nichts; Commit ohne Token schlägt fehl; Token ist
  Single-Use; fremde `pieceId` abgelehnt; `finalized`-Termin abgelehnt; `version`-Konflikt → 409;
  Token ohne `events:write` → 403
- `tests/apiTokenExpiryNotifier.test.js` – 7-Tage-Fenster, Idempotenz über `expiryNotifiedAt`
- `tests/oauth.controller.test.js` – Metadaten, Registrierung (unsichere `redirect_uri` abgelehnt),
  PKCE-Pflicht, Consent nur für verwaltete Chöre, Code-Replay, Refresh-Rotation und Reuse-Erkennung,
  Revoke; der ausgestellte Access-Token wird gegen die MCP-Middleware geprüft

---

## 10. Umsetzungsreihenfolge

| Phase | Inhalt | Ergebnis |
|-------|--------|----------|
| **1 – Fundament** | Modell + Migration, Token-Service (Erzeugen/Hashen/Verifizieren), `apiToken.middleware.js`, CRUD-Routen, Tests | Token erstellbar, aber noch ohne Nutzen |
| **2 – Frontend** | Verwaltungsseite, Dialoge, Service | Chorverwalter kann Tokens selbst verwalten |
| **3 – Mail** | Template `api-token-expiry`, `apiTokenExpiryNotifier.service.js`, Start in `app.js` | 7-Tage-Warnung läuft |
| **4 – MCP Core** | `src/mcp/server.js`, Serializer, Tools `get_choir_info`, `list_upcoming_events`, `list_repertoire`, Route `/mcp` | Erster funktionierender MCP-Zugriff |
| **5 – Suche & Plan** | `search`, `fetch`, `get_service_plan`, `get_next_duties`; Extraktion `search.service.js` | Vollständiger Lese-Katalog |
| **5a – Statistik & Rückblick** | Extraktion `repertoireStats.service.js` + `stats.service.js`; Tools `get_last_event`, `list_recent_events`, `get_piece_history`, `get_repertoire_stats`, `suggest_pieces` | „Was war letzte Probe?", „Wann zuletzt gesungen?" beantwortbar |
| **5b – Schreibzugriff** | Scope `events:write`, `resolve_pieces`, `prepare_event_pieces`, `commit_event_pieces`, Write-Audit, Frontend-Opt-in | Liederliste per Chat pflegbar |
| **6 – Härtung** | Usage-Log, Per-Token-Quota, Auto-Revoke bei Rollenverlust, Log-Redaction, Isolations-/PII-/Write-Tests im CI | Produktionsreif |
| **7 – ChatGPT** | OAuth-2.1-Fassade vor `/api/mcp` (PKCE + DCR), Consent-Seite im Frontend, Setup-Anleitung | Connector in ChatGPT einrichtbar |

---

## 12. OAuth-Fassade (Phase 7, umgesetzt)

> Ziel: Clients, die keinen statischen Bearer-Header anbieten, können sich selbst verbinden.
> Der ausgestellte Access-Token ist bewusst ein **regulärer Chor-API-Token** – damit gelten
> Ablaufobergrenze, Ablaufmail, Quoten, Auto-Revoke und der Widerruf in der UI unverändert.

### Endpunkte

| Methode | Pfad | Zweck |
|---------|------|-------|
| `GET` | `/api/oauth/.well-known/oauth-protected-resource` | RFC 9728, verweist auf den Authorization Server |
| `GET` | `/api/oauth/.well-known/oauth-authorization-server` | RFC 8414 Metadaten |
| `POST` | `/api/oauth/register` | RFC 7591 Dynamic Client Registration, nur Public Clients |
| `GET` | `/api/oauth/authorize` | Validiert die Anfrage und leitet auf die Consent-Seite |
| `GET` | `/api/oauth/consent-info` | Daten für die Consent-Seite (Session-Auth) |
| `POST` | `/api/oauth/authorize` | Consent-Entscheidung, erzeugt den Authorization Code |
| `POST` | `/api/oauth/token` | `authorization_code` und `refresh_token` |
| `POST` | `/api/oauth/revoke` | RFC 7009 |

Zusätzlich sind die Discovery-Dokumente auf `/.well-known/oauth-*` gemountet, falls der
Reverse-Proxy diese Pfade an Node weiterleitet.

### Ablauf

1. Client ruft `POST /api/mcp` ohne Token auf → `401` mit
   `WWW-Authenticate: Bearer resource_metadata="…/api/oauth/.well-known/oauth-protected-resource"`.
2. Client liest die Metadaten, registriert sich über `/register` und erhält eine `client_id`
   (kein Secret – PKCE ersetzt es).
3. Browser-Redirect auf `/api/oauth/authorize` → Weiterleitung auf `/oauth/consent` im Frontend.
   Nicht angemeldete Nutzer landen über den `AuthGuard` im Login und kommen zurück.
4. Der Chorverwalter wählt den Chor, sieht die angefragten Rechte und bestätigt.
5. `POST /api/oauth/token` tauscht Code + `code_verifier` gegen einen Chor-API-Token
   (Label `OAuth: <Clientname>`) und einen Refresh-Token.
6. Refresh rotiert beide Geheimnisse und verlängert die Laufzeit auf erneut 90 Tage.

### Einschränkungen

- Nur `response_type=code`, nur `code_challenge_method=S256`, nur `token_endpoint_auth_method=none`.
- `scope` akzeptiert ausschließlich die bekannten Scope-Namen; `events:write` wird still entfernt,
  wenn `MCP_WRITE_ENABLED=false` gesetzt ist.
- Ein Grant zählt gegen `API_TOKEN_MAX_PER_CHOIR`.

---

## 11. Neue Umgebungsvariablen

```
MCP_ENABLED=true
MCP_PERSON_REF_SECRET=<32+ Byte Zufall>        # HMAC für pseudonyme Personen-Referenzen
API_TOKEN_MAX_DAYS=90
API_TOKEN_MAX_PER_CHOIR=5
API_TOKEN_EXPIRY_WARN_DAYS=7
API_TOKEN_EXPIRY_CHECK_INTERVAL_MS=3600000
MCP_RATE_LIMIT_PER_MIN=60
MCP_RATE_LIMIT_PER_DAY=5000
MCP_WRITE_ENABLED=true                          # globaler Kill-Switch für alle Schreib-Tools
MCP_WRITE_QUOTA_PER_DAY=20
MCP_CONFIRMATION_TTL_SEC=300
```

`.env` wird nicht deployed – Variablen sind auf dem Server zu ergänzen und in `.env.example`
zu dokumentieren.
