# Frontend-Gesamtprüfung – Umsetzungsprotokoll

## Sprint/Iteration: Start

Datum: 2026-06-17

Leitprinzip dieser Iteration: **möglichst viele wiederkehrende UI-Muster als Shared-Komponenten extrahieren**.

## ToDo-Liste mit Umsetzungsplan (arbeitsfähig)

### Phase 0 – aktuell in Umsetzung

- [x] Planstand validieren und mit aktuellem Live-Status synchronisieren
- [x] Routing-Inventar initial erfassen (public/protected/admin/training)
- [x] Komponenten-/SCSS-Bestandszahlen erfassen
- [x] Audit-Artefakte anlegen:
  - [x] `doc/project/frontend-audit-inventar.md`
  - [x] `doc/project/frontend-audit-baseline.md`
- [x] Baseline-Läufe stabilisieren und dokumentieren:
  - [x] Frontend-Lint mit belastbarer Ausgabe
  - [x] Frontend-Build-Baseline
  - [x] Frontend-Test-Baseline

### Phase 1 – nächste konkreten Umsetzungsschritte

- [x] Shared-UI-Kandidatenliste erstellen (Top 10 nach Wiederholungsgrad)
- [x] Erste 2 UI-Muster als wiederverwendbare Komponente definieren
- [x] Migrationspfad für diese 2 Muster mit Zielseiten festlegen

### Phase 2 – vorbereitete Folgearbeiten

- [x] Dead-Code-Sichtung via `ts-prune` + Import-Analyse
- [x] SCSS-Duplikat-Scan nach Selektor-/Token-Mustern _(initial über Warnungscluster dokumentiert)_

### Neu erzeugte Artefakte

- [x] `doc/frontend/UI-KOMPONENTEN-MIGRATIONSLISTE.md`
- [x] `doc/frontend/CODE-CLEANUP-REPORT.md`
- [x] `doc/frontend/SCSS-CLEANUP-REPORT.md`
- [x] `doc/project/FRONTEND-SECURITY-ROUTE-GUARD-MATRIX.md`
- [x] `doc/project/FRONTEND-SECURITY-NEGATIVTESTS.md`
- [x] `doc/project/TENANT-ISOLATION-TESTREPORT.md`
- [x] `doc/project/DSGVO-FRONTEND-CHECKLISTE.md`
- [x] `doc/project/RECHTSTEXTE-ABNAHMEPROTOKOLL.md`

### Umsetzungsschritt Komponentenextraktion (Quick-Win 1)

- [x] Neue Shared-Komponente `app-data-state` erstellt
- [x] `forms/form-list` auf `app-data-state` migriert
- [x] Validiert mit `lint`, `build`, `test` (grün)

### Umsetzungsschritt Komponentenextraktion (Quick-Win 2)

- [x] `collections/collection-list` auf `app-data-state` migriert
- [x] Template-Warnung (NG8107) nach Migration bereinigt
- [x] Validiert mit `lint`, `build`, `test` (grün)

### Umsetzungsschritt Komponentenextraktion (Quick-Win 3)

- [x] Confirm-Dialog-Standardisierung in `forms/form-list` umgesetzt (`confirmDelete` statt nativer `confirm`)
- [x] `admin/choir-registration-requests` ohne `window.prompt`: neuer Shared Dialog `app-reject-reason-dialog` eingeführt
- [x] Ablehnungsflow auf standardisierte `DialogHelper.openDialogWithApi`-Kette umgestellt
- [x] Validiert mit `lint` + `test` (Exit-Code 0)

### Umsetzungsschritt Komponentenextraktion (Iteration 2 – Start)

- [x] `events/event-list` auf `app-data-state` migriert (zentraler Loading/Error/Empty-State)
- [x] Retry-Flow über `app-data-state` angebunden (`loadEvents`)
- [x] Empty-Action-Buttons standardisiert (Filter zurücksetzen / Erstes Ereignis erstellen)
- [x] Validiert mit `lint` + `test` (Exit-Code 0)

### Umsetzungsschritt Komponentenextraktion (Iteration 2 – Fortsetzung)

- [x] `admin/manage-users` auf `app-data-state` migriert (zentraler Loading/Error/Empty-State)
- [x] Fehlerzustand via `handleLoadError` an Data-State angebunden
- [x] Empty-Action-Buttons ergänzt (Filter zurücksetzen / Benutzer hinzufügen)
- [x] Validiert mit `lint` + `test` (Exit-Code 0)

---

## Fortschrittseintrag 2026-06-17

### Erledigt

1. Umsetzungsstart durchgeführt, Plan in aktive Abarbeitung überführt.
2. Routing-Struktur mit Guard-Kontext dokumentiert.
3. Inventar- und Baseline-Dateien als prüfbare Artefakte angelegt.

### Feststellungen

- Route-Schutz ist breit vorhanden (`AuthGuard`, `AdminGuard`, `ChoirAdminGuard`, `ProgramGuard`).
- Für Security- und Mandantentrennung sind nun die nötigen Ausgangslisten vorhanden.
- Baseline ist vollständig messbar und stabil: Lint & Tests grün, Build erfolgreich mit Warnungen.

### Erfasste Baseline-Ergebnisse (technisch)

- Lint: **erfolgreich** (`All files pass linting`)
- Build: **erfolgreich** (Budget-Warnungen)
- Tests: **erfolgreich** (`TOTAL: 402 SUCCESS`)

### ToDo-Liste mit Umsetzungsplan (notwendige Handlungen)

#### Sofort (Blocker)

- [x] Lint-Fehler behoben in `src/app/features/admin/choir-registration-requests/choir-registration-requests.component.ts`
- [x] Test-Fix 1: `MainLayoutComponent` Rollen-Navigation-Spec stabilisiert
- [x] Test-Fix 2: `MonthlyPlanComponent` API-Mock um `getEvents` ergänzt
- [x] Test-Fix 3: `ProfileComponent` Demo-User-Assertions an aktuelles UI-Verhalten angepasst

#### Kurzfristig (Qualität)

- [ ] Sass `mixed-decls` Warnungen in priorisierten Dateien bereinigen (`chat`, `monthly-plan`, `literature-list`, `choir-members`, `event-list`, `_breakpoints.scss`)
- [ ] Budget-Warnungen reduzieren (SCSS-Refactoring + CSS-Splitting prüfen)

#### Verifikation nach Fixes

- [x] Lint erneut ausführen und als „grün“ dokumentieren
- [x] Tests erneut ausführen und als „grün“ dokumentieren
- [x] Build erneut ausführen und Warnungsdelta dokumentieren

### Nächster geplanter Arbeitsschritt

- Iteration 1 abschließen: Regressionstests für geänderte Ansichten ergänzen.
- Iteration 2 fortsetzen: Confirm-Dialog-Standardisierung in `profile` + `monthly-plan`.

---

## Fortschrittseintrag 2026-06-17 (Update – Dialogstandardisierung)

### Erledigt

- Native Browser-Dialoge (`confirm()` / `prompt()`) in den relevanten Frontend-Komponenten auf `DialogHelperService` bzw. `TextInputDialogComponent` migriert.
- Letzte verbleibende Stelle in `shared/components/search-box/search-box.component.ts` auf `dialogHelper.confirm()` umgestellt.
- Zusätzliche Reststellen aus Iteration 2 abgearbeitet (u. a. `form-editor`, `manage-choir`, `practice-list-detail`, `rehearsal-support`, `piece-dialog`, `form-results`, `literature-list`, `exercise-player`, `pwa-config`-Bereich).

### Verifikation

- Lint: **grün** (`All files pass linting`)
- Tests: **grün** (`TOTAL: 402 SUCCESS`)
- Build: **grün** (`Application bundle generation complete`)

### Ergebnis

- Für Anwendungs-Code unter `choir-app-frontend/src/app` sind keine nativen `confirm/prompt`-Aufrufe mehr vorhanden (ausgenommen API-Signatur in `dialog-helper.service.ts`).

## Fortschrittseintrag 2026-06-17 (Update – Iteration 3 Start)

### Erledigt

- `features/library/library` auf `app-data-state` migriert (Loading/Error/Empty zentralisiert).
- Fehlerpfad in `library.component.ts` über `handleLoadError` angebunden.

### Verifikation

- Lint: **grün** (`All files pass linting`)
- Tests: **grün** (`TOTAL: 402 SUCCESS`)

### Nächster Schritt

- `features/literature/literature-list` auf `app-data-state` migrieren, um Iteration 3 für Kandidat A abzuschließen.

## Fortschrittseintrag 2026-06-17 (Update – Iteration 3 abgeschlossen)

### Erledigt

- `features/literature/literature-list` auf `app-data-state` migriert (zentraler Loading/Error/Empty-State inkl. Retry).
- Doppelte tab-spezifische Markup-Strukturen in `features/admin/organizations` auf ein datengetriebenes Tab-Modell reduziert.

### Verifikation

- Lint: **grün** (`All files pass linting`)
- Tests: **grün** (`TOTAL: 402 SUCCESS`)

### Ergebnis

- Iteration 3 aus der Migrationsliste für Kandidat A ist vollständig abgeschlossen (`library` + `literature-list`).

## Fortschrittseintrag 2026-06-17 (Update – Iteration 4)

### Erledigt

- `features/posts/post-list` auf `app-data-state` migriert (Loading/Error/Empty + Retry).
- `features/chat/chat` auf `app-data-state` für `noRoomSelected`-Zustand + `loadRoomsError`-Flag migriert.

### Verifikation

- Lint: **grün** (`All files pass linting`)
- Tests: **grün** (`TOTAL: 402 SUCCESS`)

### Ergebnis

- Alle P2-Kandidaten aus Kandidat A (`app-data-state`) der Migrationsliste sind abgeschlossen.

## Fortschrittseintrag 2026-06-17 (Update – Iteration 5)

### Erledigt

- `features/monthly-plan/monthly-plan` auf `app-data-state` migriert:
  - `#planFallback`-Template (mit lokalem Spinner) und `#noPlan`-Template (mit `app-empty-state`) zu einem einzigen `app-data-state` zusammengeführt.
  - `reloadPlan()` als Retry-Handler angebunden.

### Verifikation

- Lint: **grün** (`All files pass linting`)
- Tests: **grün** (`TOTAL: 402 SUCCESS`)
