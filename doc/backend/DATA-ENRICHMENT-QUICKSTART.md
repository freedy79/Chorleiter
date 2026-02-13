# Data Enrichment Agent - Quick Start

**TL;DR**: Automatische Metadaten-Vervollständigung für 2024 Stücke für **< 0.05 EUR** (5 Cent!)

---

## 🚀 Schnellstart

### 1. Backend-Setup (5 Minuten)

**a) Master Encryption Key generieren**

```powershell
# Führe im Terminal aus (Backend-Verzeichnis)
cd choir-app-backend
node -e "console.log('MASTER_ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
```

Kopiere den Output in deine `.env` Datei:

```powershell
# choir-app-backend\.env
MASTER_ENCRYPTION_KEY=0123456789abcdef...  # 64 hex Zeichen
```

**b) Datenbank-Migrationen ausführen**

```powershell
npm run db:migrate  # Erstellt neue Tabellen für Data Enrichment
```

### 2. Frontend-Admin-Konfiguration (10 Minuten)

**a) Navigate zum Admin-Bereich**

```
http://localhost:4200/admin/data-enrichment
```

**b) Tab "Einstellungen" öffnen**

**c) Provider hinzufügen**

1. Klicke "Google Gemini" hinzufügen
2. API-Key besorgen: https://makersuite.google.com/app/apikey
3. API-Key einfügen (wird verschlüsselt gespeichert)
4. Modell wählen: `gemini-1.5-flash`
5. "Verbindung testen" klicken → ✅ Sollte erfolgreich sein
6. "Einstellungen speichern"

**d) Zeitplan aktivieren**

1. Toggle "Automatische Jobs aktiviert" → AN
2. Cron-Ausdruck: `0 2 * * *` (täglich 02:00 Uhr)
3. Max. Items pro Durchlauf: `200`
4. Speichern

### 3. Erster Test-Run (Optional)

**Tab "Dashboard" → Schnellzugriff**

1. Klicke "Manuellen Job starten"
2. Wähle "Piece Metadata Enrichment"
3. Limit: 10 Stücke (zum Testen)
4. Job starten

Nach ~2 Minuten:

- Tab "Vorschläge" → Siehst du die generierten Vorschläge
- Einzelnen Vorschlag reviewen
- "Annehmen" oder "Ablehnen"

---

## 💰 Was es kostet

**Für deine 2024 Stücke**:

| Aktion | Provider | Kosten |
|--------|----------|--------|
| Erstes vollständiges Enrichment | Gemini Flash | $0.05 (4 Cent) |
| Monatliche Updates (100 Stücke) | Gemini Flash | $0.004 (< 1 Cent) |
| **Jährliche Kosten** | | **< 2 EUR** |

**Vergleich mit manuellem Aufwand**:
- Manuell: 2024 × 5 min = 168 Stunden
- Automatisch: ~15 Minuten (einmalig)
- **Zeitersparnis: 99.85%**

---

## 📊 Was wird ergänzt?

Für jedes Stück mit fehlenden Daten:

✅ **Voicing** (z.B. "SATB", "SSAATTBB")  
✅ **Tonart** (z.B. "D major", "A minor")  
✅ **Opus-Nummer** (z.B. "BWV 227", "Op. 52 No. 3")  
✅ **Dauer** (in Sekunden)  
✅ **Quellen** (Links zu IMSLP, Wikidata)  

**Mit Confidence-Score**: Du siehst, wie sicher die AI ist (0.0 - 1.0)

---

## 🔄 Workflow

```
1. Agent läuft nachts (täglich 02:00 Uhr)
   ↓
2. Findet Stücke mit fehlenden Daten
   ↓
3. Fragt kostenlose Quellen ab:
   - IMSLP (Noten-Bibliothek)
   - Wikidata (Enzyklopädie)
   - MusicBrainz (Musik-Datenbank)
   ↓
4. LLM (Gemini) validiert & ergänzt Daten
   ↓
5. Speichert Vorschläge mit Confidence-Score
   ↓
6. Du reviewst in Admin-UI
   ↓
7. Ein Klick → Daten übernommen ✅
```

---

## ⚙️ Konfiguration

Alle Konfigurationen erfolgen über **Admin-UI**: `http://localhost:4200/admin/data-enrichment`

### Tab: Einstellungen

#### Provider-Strategie

- **Dual-Provider** (empfohlen): Gemini Flash primär, Claude Sonnet bei niedrigem Confidence
- **Cascading**: Automatischer Fallback-Chain bei Fehlern  
- **Budget-Optimizer**: Dynamisch basierend auf Budget & Complexity

#### Provider hinzufügen

1. "Provider hinzufügen" → Wähle aus: Gemini, Claude, OpenAI, DeepSeek
2. API-Key eingeben (wird AES-256-GCM verschlüsselt!)
3. Modell wählen
4. Priorität setzen (1 = höchste)
5. "Verbindung testen" → Validiert API-Key
6. Speichern

**Verfügbare Provider:**

| Provider | Empfohlenes Modell | Setup-Link |
|----------|-------------------|------------|
| Google Gemini | gemini-1.5-flash | https://makersuite.google.com/app/apikey |
| Anthropic Claude | claude-3-5-haiku-20241022 | https://console.anthropic.com/ |
| OpenAI | gpt-4o-mini | https://platform.openai.com/api-keys |
| DeepSeek | deepseek-chat | https://platform.deepseek.com/ |

#### Zeitplan

- **Cron-Ausdruck**: `0 2 * * *` (täglich 02:00 Uhr)
- **Max. Items/Durchlauf**: 200 (verhindert Budget-Überschreitung)
- **Aktiviert**: Toggle AN/AUS

#### Auto-Approve (optional)

⚠️ **Vorsicht**: Änderungen werden ohne Review übernommen!

- **Minimale Confidence**: 0.95 (nur sehr sichere Vorschläge)
- Empfehlung: Deaktiviert lassen für erste Wochen

---

## 🎯 Fortgeschrittene Features

### Dubletten-Erkennung

```bash
npm run enrichment:duplicates
# Findet Komponisten/Verlage mit ähnlichen Namen
# Schlägt Zusammenführung vor
```

**Beispiel**:
```
"Bach, J.S." ≈ "Bach, Johann Sebastian" → Merge-Vorschlag
"Carus Verlag" ≈ "Carus-Verlag" → Merge-Vorschlag
```

### Komponisten-Daten ergänzen

```bash
npm run enrichment:composers
# Ergänzt Geburtsjahr, Todesjahr
```

**Beispiel**:
```
Vor:  "Mozart, Wolfgang Amadeus"
Nach: "Mozart, Wolfgang Amadeus" (1756-1791)
```

### Premium: Thematische Analyse

```bash
npm run enrichment:themes
# Analysiert Liedtexte für Themen
# Kosten: ~5 EUR einmalig
```

**Beispiel**:
```
"Tochter Zion" → Tags: [Advent, Weihnachten, Freude]
"Es ist ein Ros entsprungen" → Tags: [Weihnachten, Maria, Stille]
```

---

## 📈 Monitoring

### Dashboard

```
http://localhost:4200/admin/data-enrichment
```
→ Tab "Dashboard"
```

Zeigt in Echtzeit:

**Monatliche Statistiken:**
- 💰 API-Kosten vs. Budget (mit Fortschrittsbalken)
- 📊 Verarbeitete Items
- ✅ Erfolgsrate & durchschnittlicher Confidence-Score

**Vorschläge:**
- ⏳ Offene Vorschläge (warten auf Review)
- ✓ Angenommene Vorschläge
- ✗ Abgelehnte Vorschläge
- ⚡ Auto-angewendete (falls aktiviert)

**Jobs:**
- 🕐 Letzter Lauf
- 📅 Nächster geplanter Lauf
- ▶️ Laufende Jobs
- ❌ Fehlgeschlagene Jobs

**Provider-Breakdown:**
- Requests pro Provider  
- Kosten pro Provider
- Erfolgsrate pro Provider

### Budget-Status (API)

Alternativ per CLI:

```powershell
# Backend-Verzeichnis
npm run enrichment:budget
```

Output:
```
╔═**Admin-UI**: Tab "Einstellungen" → Provider → "Verbindung testen"  
→ Prüfe API-Key auf Tippfehler  
→ Prüfe, ob Key noch gültig ist (bei Provider-Website einloggen)

### "Encryption error"
→ Prüfe `MASTER_ENCRYPTION_KEY` in Backend `.env`  
→ Muss **genau 64 Hex-Zeichen** sein (32 bytes)  
→ Neu generieren: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### "Budget limit reached"
→ **Admin-UI**: Tab "Einstellungen" → "Monatliches Budget" erhöhen  
→ Aktuell: Massiv überdimensioniert für 2024 Stücke ($25 vs. benötigt ~$0.10)

### "Low confidence scores"
→ **Admin-UI**: Settings → Provider hinzufügen → Claude Sonnet als Fallback  
→ Strategie auf "dual" setzen → Bei confidence < 0.7 wird Claude genutzt

### "No suggestions generated"
→ Prüfe, ob Stücke tatsächlich fehlende Daten haben:

```sql
-- Führe in Datenbank aus
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN voicing IS NULL THEN 1 ELSE 0 END) as missing_voicing,
  SUM(CASE WHEN `key` IS NULL THEN 1 ELSE 0 END) as missing_key,
  SUM(CASE WHEN opus IS NULL THEN 1 ELSE 0 END) as missing_opus
FROM pieces;
```

> Wenn alle Werte 0 sind → Keine fehlenden Daten → Agent hat nichts zu tun ✅

### "Provider connection failed"
→ Prüfe Internet-Verbindung  
→ Prüfe Firewall (Provider-APIs müssen erreichbar sein)  
→ Rate-Limit erreicht? Warte 1 Minute & teste erneut

### Jobs laufen nicht automatisch
→ **Admin-UI**: Settings → Schedule → "Automatische Jobs aktiviert" toggle prüfen  
→ Backend-Logs prüfen: `choir-app-backend/logs/`  
→ Cron-Service läuft? `node-cron` sollte im Backend aktiv sein
## 🛡️ Sicherheit

✅ **Keine Auto-Änderungen**: Alle Vorschläge müssen manuell bestätigt werden  
✅ **Audit-Trail**: Jede Änderung wird geloggt  
✅ **Rate-Limiting**: Respektvolles Verhalten gegenüber externen APIs  
✅ **Validierung**: Alle LLM-Responses werden auf Plausibilität geprüft  
✅ **Rollback**: Änderungen können rückgängig gemacht werden  

---

## 🐛 Troubleshooting

### "API Key invalid"
→ Prüfe `GEMINI_API_KEY` in `.env`

### "Budget limit reached"
→ Erhöhe `monthlyBudget` in Settings (aktuell völlig überdimensioniert für deine DB-Größe)

### "Low confidence scores"
→ Aktiviere Claude-Fallback für bessere Qualität

### "No suggestions generated"
→ Prüfe, ob Stücke tatsächlich fehlende Daten haben:
```sql
SELECT * FROM pieces WHERE voicing IS NULL OR `key` IS NULL LIMIT 10;
```

---

## 📚 Weitere Dokumentation

- **Detaillierter Plan**: [DATA-ENRICHMENT-AGENT-PLAN.md](DATA-ENRICHMENT-AGENT-PLAN.md)
- **Provider-Vergleich**: [DATA-ENRICHMENT-LLM-PROVIDERS.md](DATA-ENRICHMENT-LLM-PROVIDERS.md)
- **API-Dokumentation**: siehe `/api/admin/enrichment` Endpoints

---

## ✨ Roadmap

**Phase 1** (aktuell): Metadaten-Enrichment  
**Phase 2** (geplant): Dubletten-Erkennung  
**Phase 3** (geplant): Komponisten-Daten  
**Phase 4** (optional): Thematische Analyse  
**Phase 5** (optional): Intelligente Setlist-Vorschläge  

---

**Erstellt**: 13. Februar 2026  
**Für**: Chorleiter-Datenbank (2024 Stücke)  
**Geschätzte Kosten**: < 2 EUR/Jahr  
**Zeitersparnis**: 168 Stunden → 15 Minuten
