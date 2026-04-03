## Beschreibung
<!-- Kurze Beschreibung der Änderungen -->

## Art der Änderung
<!-- Bitte zutreffende Optionen markieren -->
- [ ] 🐛 Bugfix (nicht-breaking Change, der ein Issue behebt)
- [ ] ✨ Neues Feature (nicht-breaking Change, der Funktionalität hinzufügt)
- [ ] 💥 Breaking Change (Fix oder Feature, das bestehende Funktionalität verändert)
- [ ] 📝 Dokumentation (nur Dokumentationsänderungen)
- [ ] 🔧 Konfiguration (CI, Build-Config, Dependencies)
- [ ] ♻️ Refactoring (Code-Verbesserungen ohne funktionale Änderungen)
- [ ] ⚡ Performance (Performance-Verbesserungen)
- [ ] ✅ Tests (Hinzufügen oder Korrektur von Tests)

## Betroffene Komponenten
<!-- Automatisch durch Labeler gesetzt, manuell ergänzen falls nötig -->
- [ ] Backend
- [ ] Frontend
- [ ] Datenbank
- [ ] API
- [ ] UI Components
- [ ] Services
- [ ] Tests
- [ ] Dokumentation
- [ ] CI/CD
- [ ] Security

## Checkliste
<!-- Bitte alle zutreffenden Punkte abhaken -->

### Code-Qualität
- [ ] Code folgt den Projektkonventionen (siehe `.github/copilot-instructions.md`)
- [ ] Self-review durchgeführt
- [ ] Code ist kommentiert (besonders komplexe Logik)
- [ ] ESLint/TSLint-Warnungen behoben
- [ ] Keine `console.log()` in Produktionscode (Frontend)
- [ ] Keine hardcoded Secrets oder Credentials

### Testing
- [ ] Neue Tests für neue Features hinzugefügt
- [ ] Bestehende Tests angepasst (falls nötig)
- [ ] Alle Tests laufen lokal erfolgreich
- [ ] Backend-Tests: `npm test --prefix choir-app-backend`
- [ ] Frontend-Tests: `npm run test --prefix choir-app-frontend`

### Backend-spezifisch
- [ ] Controller verwenden `asyncHandler` (keine try-catch)
- [ ] Neue `require()`-Dependencies in `package.json` eingetragen
- [ ] **KEIN** `sequelize.sync({ alter: true })` verwendet
- [ ] Migrations für Schema-Änderungen erstellt (in `src/init/`)
- [ ] Middleware-Reihenfolge beachtet: `verifyToken` → `requireNonDemo` → Role-Checks
- [ ] Logging-Service verwendet (statt `console.log`)

### Frontend-spezifisch
- [ ] Angular Material Components korrekt verwendet
- [ ] Responsive Design getestet (Handset, Tablet, Desktop)
- [ ] Dark Mode kompatibel (Mixins aus `_dark-mode-variables.scss` verwendet)
- [ ] ViewChild-Setter-Pattern für MatSort/MatPaginator verwendet
- [ ] Mobile Typography berücksichtigt (Font-Scaling für Handsets)
- [ ] Accessibility: ARIA-Labels, Keyboard-Navigation, Kontraste geprüft

### Dokumentation
- [ ] README aktualisiert (falls nötig)
- [ ] API-Änderungen dokumentiert
- [ ] Breaking Changes im PR beschrieben
- [ ] Neue Environment-Variablen in `.env.example` dokumentiert (falls vorhanden)

### Deployment
- [ ] Migrations-Plan für Produktionsumgebung vorhanden (bei DB-Änderungen)
- [ ] Backwards-kompatibel ODER Rollback-Strategie definiert
- [ ] Performance-Impact analysiert (bei großen Änderungen)

## Teststrategie
<!-- Beschreibe, wie du die Änderungen getestet hast -->

**Testumgebung:**
- [ ] Lokale Entwicklung (SQLite)
- [ ] Staging/Test-Server (PostgreSQL)
- [ ] Browser-Tests: Chrome / Firefox / Safari / Mobile

**Testschritte:**
1. 
2. 
3. 

## Screenshots / Videos
<!-- Bei UI-Änderungen bitte Screenshots oder Videos anhängen -->
<!-- Zeige Desktop- und Mobile-Ansicht -->

## Verwandte Issues
<!-- Verlinke zugehörige Issues -->
Fixes #
Related to #

## Notizen für Reviewer
<!-- Zusätzliche Hinweise, offene Fragen, oder Bereiche, die besondere Aufmerksamkeit brauchen -->

---

## Reviewer-Checkliste
<!-- Für Code-Reviewer -->
- [ ] Code-Review durchgeführt
- [ ] Architektur-Entscheidungen sinnvoll
- [ ] Sicherheitsaspekte geprüft
- [ ] Performance-Implikationen bewertet
- [ ] Tests abgedeckt kritische Pfade
- [ ] Dokumentation ausreichend
- [ ] Deployment-Risiken akzeptabel
