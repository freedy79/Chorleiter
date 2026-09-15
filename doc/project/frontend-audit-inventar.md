# Frontend Audit Inventar

Stand: 2026-06-17

## 1) Routing-Inventar (erste vollständige Erfassung)

Quelle: `choir-app-frontend/src/app/app-routing.module.ts`, `features/admin/admin.routes.ts`, `features/training/training.routes.ts`

### Öffentlich (ohne AuthGuard)

- `c/:slug`
- `shared-piece/:token`
- `poll-vote/:token`
- `ota/:token`
- `forms/public/:guid`
- `''` (Welcome)
- `login`
- `register/:token`
- `join/:token`
- `register-choir/:token`
- `forgot-password`
- `reset-password/:token`
- `confirm-email/:token`
- `demo/:token`
- `imprint`
- `privacy`
- `donate`
- `donation-success`
- `donation-cancel`

### Geschützt (AuthGuard-basiert)

- `forms`-Bereich (Teilrouten mit `AuthGuard`, teils zusätzlich `ChoirAdminGuard`)
- `dashboard`
- `collections/*`
- `events`
- `posts`
- `chat`
- `dienstplan`
- `availability`
- `programs*` (zusätzlich `ProgramGuard`)
- `stats`
- `library*`
- `repertoire`
- `practice-lists*`
- `pieces/:id`
- `search`
- `profile`
- `members`
- `participation`
- `manage-choir`
- `public-page` (zusätzlich `ChoirAdminGuard`)

### Admin/Testbereiche

- `admin/**` via `AuthGuard + AdminGuard` (lazy loaded)
- `training/**` via `AuthGuard + AdminGuard` (lazy loaded)

### Fallback

- `** -> login`

---

## 2) Komponenten-/Seiten-Inventar (Status: initial)

Automatisch gezählte Dateien:

- `*.component.ts`: **216**
- `*.component.scss`: **143**
- Theme-SCSS (`src/themes/**/*.scss`): **10**

Hinweis: Detaillierte Kategorisierung (Feature/Shared/Layout/Dialog/Widget) folgt in der nächsten Iteration.

---

## 3) SCSS-Inventar (Status: initial)

### Zentrale Theme-Dateien

- `src/themes/_breakpoints.scss`
- `src/themes/_dark-mode-variables.scss`
- `src/themes/_cards.scss`
- `src/themes/_form-fields.scss`
- `src/themes/_responsive-utilities.scss`
- `src/themes/_table-utilities.scss`
- `src/themes/_nak-theme.scss`
- `src/themes/_training-tokens.scss`
- `src/themes/_index.scss`
- `src/themes/sartorius.scss`

### Nächster Schritt

- SCSS-Duplikate und Token-Verstöße über alle `*.component.scss` identifizieren.
