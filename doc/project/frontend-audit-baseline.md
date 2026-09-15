# Frontend Audit Baseline

Stand: 2026-06-17

## 1) Verfügbare Qualitäts-Skripte

Quelle: `package.json` (Root) und `choir-app-frontend/package.json`

- Root:
  - `npm run lint`
  - `npm run build`
  - `npm test`
  - `npm run pre-check:frontend`
- Frontend:
  - `npm run lint --prefix choir-app-frontend`
  - `npm run build --prefix choir-app-frontend`
  - `npm test --prefix choir-app-frontend`
  - `npm run prune --prefix choir-app-frontend` (Dead-Code-Hinweis)

## 2) Baseline-Diagnostik (IDE-Analyse)

Aktueller Diagnose-Stand (aus Workspace-Fehlern):

- `tsconfig.app.json`
  - TypeScript-Hinweis: `baseUrl` deprecated (TS7)
  - Hinweis zu `rootDir`-Layout
- `tsconfig.spec.json`
  - TypeScript-Hinweis: `baseUrl` deprecated (TS7)
  - Hinweis zu `rootDir`-Layout
- Angular Template Diagnostics (NG8107)
  - `src/app/features/posts/post.component.html`
  - `src/app/features/admin/mail-logs/mail-logs.component.html`

## 3) Laufstatus Kommandos

- `npm run lint --prefix choir-app-frontend` _(Re-Run nach Fixes)_
  - Ergebnis: **ERFOLG (Exit Code 0)**
  - Befund: `All files pass linting.`

- `npm run lint --prefix choir-app-frontend`
  - Ergebnis: **FEHLER (Exit Code 1)**
  - Befund:
    - `src/app/features/admin/choir-registration-requests/choir-registration-requests.component.ts:50:11`
    - `@typescript-eslint/no-unused-vars`: `'requests' is assigned a value but never used`

- `npm run build --prefix choir-app-frontend`
  - Ergebnis: **ERFOLG (Exit Code 0)**
  - Dauer: **54.741s**
  - Hinweise/Warnungen:
    - Initial-Bundle-Budget minimal überschritten (`+2.90 kB`)
    - SCSS-Budget-Warnungen u. a. in:
      - `src/app/features/chat/chat.component.scss`
      - `src/app/features/monthly-plan/monthly-plan.component.scss`
      - `src/app/features/training/exercises/exercise-player/exercise-player.component.scss`

- `npm test --prefix choir-app-frontend -- --watch=false`
  - Ergebnis: **FEHLER (Exit Code 1)**
  - Gesamtergebnis: **402 ausgeführt, 399 erfolgreich, 3 fehlgeschlagen**
  - Fehlgeschlagene Tests:
    - `MainLayoutComponent shows editing navigation entries for privileged choir roles`
    - `MonthlyPlanComponent should update plan data only after all parallel requests completed`
      - Laufzeitfehler: `TypeError: this.api.getEvents is not a function`
    - `ProfileComponent disables editing actions for demo users`
  - Zusätzliche Beobachtung:
    - Mehrere Sass-Deprecation-Warnungen (`mixed-decls`), v. a. in `chat`, `monthly-plan`, `literature-list`, `choir-members`, `event-list`, sowie `src/themes/_breakpoints.scss`

- `npm test --prefix choir-app-frontend -- --watch=false` _(Re-Run nach Fixes)_
  - Ergebnis: **ERFOLG (Exit Code 0)**
  - Gesamtergebnis: **TOTAL: 402 SUCCESS**
  - Beobachtung:
    - Sass-Deprecation-Warnungen (`mixed-decls`) weiterhin vorhanden (nicht-blockierend)

## 4) Baseline-Folgeaktionen

- [x] Lint mit stabiler Ausgabe erfassen (Exit-Code + Warnungen)
- [x] Build-Baseline erfassen (Dauer, Erfolg/Fehler)
- [x] Test-Baseline erfassen (Anzahl Tests, Erfolg/Fehler)
- [ ] Optional: `npm run prune --prefix choir-app-frontend` zur Dead-Code-Heatmap

## 5) Priorisierte technische Folgeaufgaben

1. Sass-Deprecation-Warnungen schrittweise bereinigen (`mixed-decls`).
2. Budget-Warnungen beobachten und SCSS-/Bundle-Footprint reduzieren.
3. Optional: `npm run prune --prefix choir-app-frontend` für Dead-Code-Heatmap durchführen.
