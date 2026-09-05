# Frontend-Gesamtprüfung – Umsetzungsplan

Stand: 2026-06-17  
Repository: `freedy79/Chorleiter`  
Branch: `features/iteration_june_2026`

## Zielbild

Dieser Plan dient als strukturierte Arbeitsgrundlage, um das gesamte Frontend entlang der definierten Prüfkriterien zu überprüfen, zu vereinheitlichen und abzusichern.

### Leitziel Komponentenarchitektur

- [ ] **Ziel: Möglichst viele wiederkehrende UI-Muster als Shared-Komponenten extrahieren**, um Duplikate zu reduzieren, Wartbarkeit zu erhöhen und konsistente UX sicherzustellen.

## Prüfkriterien (Scope)

- [ ] Gleiche/ähnliche UI-Elemente vereinheitlichen, als Komponenten auslagern und wiederverwenden
- [ ] Toten Code entfernen
- [ ] SCSS aufräumen
- [ ] Sicherheit: kein direkter/unauthorisierter Zugriff nur über bekannte URL
- [ ] Strikte Trennung von Chordaten (Mandantentrennung)
- [ ] Datenschutz nach EU/Deutschland prüfen
- [ ] Impressum und Datenschutzerklärung prüfen (inkl. Online-Prüfung auf `www.nak-chorleiter.de`)

---

## Phase 0 – Vorbereitung & Baseline (Tag 1)

### Aufgaben

- [x] Vollständige Routenliste erstellen (öffentlich, geschützt, admin, choir-spezifisch)
- [x] Komponenten-/Seiten-Inventar erstellen
- [x] SCSS-Inventar erstellen (global vs. feature-lokal)
- [x] Baseline erfassen: Build, Lint, Tests, ggf. Bundle-Größen _(initiale Baseline erstellt, technische Folgevalidierung läuft)_

### Ergebnisse

- [x] Artefakt: `doc/project/frontend-audit-inventar.md`
- [x] Artefakt: `doc/project/frontend-audit-baseline.md`

### Umsetzungsprotokoll

- [x] Protokoll angelegt: `doc/project/FRONTEND-GESAMTPRUEFUNG-PROTOKOLL.md`

---

## Phase 1 – UI-Vereinheitlichung (Woche 1)

### Aufgaben

- [x] Wiederkehrende UI-Muster identifizieren (Buttons, Filterleisten, Form-Layouts, Dialog-Header, Status-States) _(initiale Top-10-Liste erstellt)_
- [x] Kandidaten für Shared Components priorisieren _(initiale Priorisierung erstellt)_
- [x] Wiederverwendbare Komponenten-APIs definieren (Inputs/Outputs, Accessibility, Theming) _(für Kandidat A/B initial dokumentiert)_
- [ ] Erste Migrationen umsetzen (Quick Wins zuerst) _(Quick-Win 1+2 erledigt: `app-data-state` in `forms/form-list` und `collections/collection-list` integriert)_
- [ ] Extraktionsquote steigern: pro Iteration mindestens 1 weiteres Muster in Shared-Komponente überführen

### Prüfpunkte

- [ ] Einheitliche Loading/Empty/Error/Success-States
- [ ] Keine Duplikat-Templates bei gleichen UI-Zwecken
- [ ] Accessibility-Basis erfüllt (Labels, Fokus, Tastaturbedienbarkeit)

### Ergebnisse

- [x] Artefakt: `doc/frontend/UI-COMPONENT-STANDARDKATALOG.md`
- [x] Migrationsliste je Feature-Modul (`doc/frontend/UI-KOMPONENTEN-MIGRATIONSLISTE.md`)
- [x] Quick-Win 3 gestartet und umgesetzt: Confirm-Dialog-Standardisierung in `admin/choir-registration-requests` + `forms/form-list`

---

## Phase 2 – Toter Code & SCSS-Cleanup (Woche 1–2)

### Aufgaben

- [ ] Ungenutzte Komponenten/Services/Pipes/Modelle identifizieren
- [ ] Tote Imports/Exports entfernen
- [ ] Nicht verwendete SCSS-Regeln, Variablen, Mixins entfernen
- [ ] SCSS auf Design-Tokens/Mixins konsolidieren (keine harten Farben/Abstände)

### Prüfpunkte

- [ ] Build/Lint ohne „unused“-Warnungen
- [ ] Keine SCSS-Duplikate für gleiche Gestaltungslogik
- [ ] Responsive und Dark-Mode-Regeln konsistent

### Ergebnisse

- [x] Artefakt: `doc/frontend/SCSS-CLEANUP-REPORT.md` _(initiale Befunde + ToDos)_
- [x] Artefakt: `doc/frontend/CODE-CLEANUP-REPORT.md` _(initiale Befunde + ToDos)_

---

## Phase 3 – Security-Review (Woche 2)

> Grundsatz: Frontend steuert UX, Autorisierung wird serverseitig erzwungen.

### Aufgaben

- [ ] Guard-Matrix pro Route erstellen (welche Rolle darf wohin?)
- [ ] Direkte URL-Aufrufe aller geschützten Routen testen
- [ ] Session-Ablauf/Token-Expiry/Role-Change testen
- [ ] UI-Element-Sichtbarkeit vs. echte API-Berechtigung gegenprüfen

### Prüfpunkte

- [ ] Unautorisierte Aufrufe führen zu Redirect oder 401/403
- [ ] Kein Datenzugriff ausschließlich durch bekannte URL möglich
- [ ] Keine sensitiven Daten in Client-Fehlern/Logs

### Ergebnisse

- [x] Artefakt: `doc/project/FRONTEND-SECURITY-ROUTE-GUARD-MATRIX.md` _(initial)_
- [x] Artefakt: `doc/project/FRONTEND-SECURITY-NEGATIVTESTS.md` _(initial)_

---

## Phase 4 – Mandantentrennung (Woche 2–3)

### Aufgaben

- [ ] Mandantenkontext (`choirId`) entlang aller choir-relevanten Flows prüfen
- [ ] Kontextwechsel-Tests (Mandant A ↔ B, Rolle X ↔ Y) durchführen
- [ ] Caching-/State-Leaks prüfen (Navigation, Reload, Browser Back)
- [ ] API-Responses auf Cross-Tenant-Daten prüfen

### Prüfpunkte

- [ ] 0 Cross-Tenant-Sichtbarkeit in UI und Requests
- [ ] Context-Switch invalidiert alte tenant-gebundene Daten
- [ ] Keine mandantenfremden IDs in Links/Formularen/Responses

### Ergebnisse

- [x] Artefakt: `doc/project/TENANT-ISOLATION-TESTREPORT.md` _(initial)_

---

## Phase 5 – Datenschutz (EU/DE) & Rechtstexte (Woche 3)

### Aufgaben

- [ ] Datenschutz-Check im Frontend: Datensparsamkeit, Transparenz, Speicherdauer-Hinweise
- [ ] Client-Speicher prüfen (Local/Session Storage, Caches, PII)
- [ ] Tracking/Telemetry auf Rechtsgrundlage und Datenminimierung prüfen
- [ ] Impressum und Datenschutzerklärung in der App auf Erreichbarkeit prüfen
- [ ] Online-Prüfung `www.nak-chorleiter.de` durchführen

### Prüfpunkte

- [ ] Rechtstexte in Desktop + Mobile sichtbar und leicht erreichbar
- [ ] Keine unnötige Speicherung personenbezogener Daten im Client
- [ ] Dokumentierte Datenflüsse für personenbezogene Daten

### Ergebnisse

- [x] Artefakt: `doc/project/DSGVO-FRONTEND-CHECKLISTE.md` _(initial)_
- [x] Artefakt: `doc/project/RECHTSTEXTE-ABNAHMEPROTOKOLL.md` _(initial)_

### Aktueller Status Online-Prüfung (2026-06-17)

- Status: **erreichbar/verifiziert** (Impressum + Datenschutzerklärung öffentlich abrufbar)
- Geprüfte URLs:
  - `https://nak-chorleiter.de/`
  - `https://nak-chorleiter.de/imprint`
  - `https://nak-chorleiter.de/privacy`
- Beobachtung:
  - Startseite enthält Links auf `Impressum` und `Datenschutz`.
  - `Impressum` liefert Inhalte gemäß § 5 TMG.
  - `Datenschutz` enthält DSGVO-/BDSG-Bezug und Betroffenenrechte.

---

## Phase 6 – Abschluss, Priorisierung, Abarbeitung (Woche 3–4)

### Aufgaben

- [ ] Findings nach Kritikalität klassifizieren (Critical/High/Medium/Low)
- [ ] Maßnahmen in umsetzbare Tickets schneiden
- [ ] Quick Wins sofort umsetzen
- [ ] Risiken mit hoher Tragweite zuerst umsetzen (Security/Tenant/Datenschutz)

### Abschlusskriterien

- [ ] Alle Findings haben Ticket, Owner, Priorität und Zieltermin
- [ ] Kritische Findings = 0 offen
- [ ] Dokumentation aktualisiert und nachvollziehbar

---

## Arbeitsboard (zur direkten Abarbeitung)

### Backlog

- [ ] EPIC: UI-Vereinheitlichung
- [ ] EPIC: Code/SCSS-Cleanup
- [ ] EPIC: Security-Route-Härtung
- [ ] EPIC: Mandantentrennung
- [ ] EPIC: Datenschutz & Rechtstexte

### In Arbeit

- [ ] Erste Migrationen umsetzen (Quick Wins zuerst, Ziel: hohe Extraktionsquote)
- [ ] Dead-Code-Bereinigung Batch 1 (P1-Kandidaten)
- [ ] SCSS-Warnungsabbau Batch 1 (mixed-decls in Top-Dateien)

### Erledigt

- [x] Prüfplan initial erstellt
- [x] Phase 0 Initial-Artefakte erstellt (Inventar + Baseline + Protokoll)
- [x] Phase 0 Folgevalidierung mit echten Lint/Build/Test-Läufen durchgeführt
- [x] Baseline-Blocker behoben (Lint grün, Tests grün)
- [x] Phase-1 API-Verträge + Migrationsliste initial erstellt
- [x] Phase-2 Initial-Reports für Code/SCSS erstellt
- [x] Quick-Win Komponentenextraktion gestartet (`app-data-state` + Migration in `form-list`)
- [x] Quick-Win Komponentenextraktion fortgeführt (`app-data-state` + Migration in `collection-list`)
- [x] Quick-Win 3 umgesetzt (Confirm-Dialog-Standardisierung inkl. neuer `app-reject-reason-dialog` Komponente)
- [x] Iteration-2-Start umgesetzt (`app-data-state` in `events/event-list`)
- [x] Iteration-2-Fortsetzung umgesetzt (`app-data-state` in `admin/manage-users`)
- [x] Iteration-2 Dialogharmonisierung erweitert (native `confirm/prompt` durch `DialogHelper`/`TextInputDialog` ersetzt)
- [x] Phase-3/4/5 Initial-Artefakte angelegt

---

## Fortschrittsmessung (wöchentlich)

- [ ] KPI 1: Anzahl duplizierter UI-Muster reduziert
- [ ] KPI 2: Anzahl entfernter toter Artefakte (Code/Styles)
- [ ] KPI 3: Anzahl bestandener Security-Negativtests
- [ ] KPI 4: Anzahl bestandener Mandantentrennungs-Tests
- [ ] KPI 5: Datenschutz-Checkliste vollständig
- [ ] KPI 6: Impressum/Datenschutz online verifiziert

---

## Verantwortlichkeiten (auszufüllen)

- Produktverantwortung: [ ]
- Frontend Lead: [ ]
- Security Review: [ ]
- Datenschutz-Review: [ ]
- QA/Test: [ ]

---

## Hinweise

- Dieser Plan ist als lebendes Dokument gedacht und wird nach jedem Prüfabschnitt aktualisiert.
- Änderungen mit hoher Auswirkung (Security, Mandantentrennung, Datenschutz) haben Vorrang vor kosmetischen Themen.
