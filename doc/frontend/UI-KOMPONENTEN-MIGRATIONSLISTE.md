# UI-Komponenten Migrationsliste je Feature-Modul

Stand: 2026-06-17

Ziel: Wiederkehrende Muster systematisch in Shared-Komponenten überführen.

## Priorisierung

- **P1 (Quick Wins):** hoher Duplikatgrad, geringes Risiko
- **P2:** mittleres Risiko / mehrere Abhängigkeiten
- **P3:** größere Umbauten

---

## Kandidat A – `app-data-state` (Loading/Error/Empty/Content)

### P1

- `features/forms/form-list`
- `features/collections/collection-list`
- `features/events/event-list`
- `features/admin/manage-users`
- `features/admin/organizations`

### P2

- [x] `features/literature/literature-list`
- [x] `features/library/library`
- [x] `features/posts/post-list`
- [x] `features/chat/chat`

### P3

- [x] `features/monthly-plan/monthly-plan` – `#planFallback`/`#noPlan` auf `app-data-state` migriert
- [x] `features/program/program-editor` – kein eigenständiger Lade-/Fehlerzustands-UI (keine Migration notwendig)

---

## Kandidat B – Confirm Dialog Standardisierung

### P1

- `features/admin/choir-registration-requests`
- `features/forms/form-list`
- `features/user/profile`
- `features/monthly-plan/monthly-plan`

### P2

- [x] `features/library/*` (Lösch-/Entleihaktionen) – bereits migriert
- [x] `features/collections/*` – bereits migriert
- [x] `features/literature/*` – bereits migriert

### P3

- [x] `features/admin/*` – geprüft, keine nativen `confirm`-Aufrufe mehr vorhanden

---

## Iterationsplan (konkret)

## Iteration 1

- [x] `app-data-state` in `form-list` + `collection-list` einführen
- [x] Confirm-Dialog auf `choir-registration-requests` angleichen
- [x] Delete-Confirm in `form-list` auf `DialogHelper.confirmDelete` angleichen
- [ ] Regressionstests für geänderte Ansichten ergänzen

## Iteration 2

- [x] `app-data-state` in `event-list`
- [x] `app-data-state` in `manage-users`
- [x] Confirm-Dialog auf `profile` + `monthly-plan`
- [x] Native `confirm/prompt`-Aufrufe in Feature-Komponenten standardisiert (`DialogHelper` / `TextInputDialog`)

## Iteration 3

- [x] `app-data-state` in `literature-list` + `library`
  - [x] `library` auf `app-data-state` migriert
  - [x] `literature-list` auf `app-data-state` migriert
- [x] Restliche Confirm-/Prompt-Dialog-Aufrufe harmonisieren

## Iteration 4

- [x] `app-data-state` in `post-list` (Loading/Error/Empty State + Retry)
- [x] `app-data-state` in `chat` (noRoomSelected State + Error-Handling für `loadRooms`)

## Iteration 5

- [x] `app-data-state` in `monthly-plan` – `#planFallback` + lokalen Spinner zu einem zentralen State zusammengeführt

---

## Messung der Extraktionsquote

- Basiswert: Anzahl feature-lokaler Zustands-/Dialog-Implementierungen
- Ziel je Iteration: **mindestens 1 weiteres Muster extrahieren**
- KPI:
  - reduzierte Duplikat-Templates
  - reduzierte SCSS-Duplikate
  - steigende Nutzung von Shared-Komponenten
