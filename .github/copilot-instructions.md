# Chorleiter Codebase Guide

## Architecture Overview

**Monorepo Structure**: Separate Angular 20 frontend (`choir-app-frontend/`) and Node.js/Express backend (`choir-app-backend/`) with shared root package scripts.

### Backend (Node.js/Express + Sequelize)
- **Database**: Sequelize ORM supporting both PostgreSQL (production) and SQLite (testing). Models define associations in `src/models/index.js`.
- **Auth**: JWT-based with dual-level authorization: global roles (`admin`, `demo`) + choir-specific roles (`director`, `librarian`) stored in `user_choir.rolesInChoir` array.
- **Middleware Stack**: Order matters! Apply `verifyToken` → `requireNonDemo` → choir-role checks (`requireDirector`, `requireLibrarian`). Use `asyncHandler` from `express-async-handler` to wrap all controller functions.
- **Request Context**: Per-request storage via `runWithRequestContext` middleware stores `userId` and `roles` for logging service.
- **Error Handling**: Centralized in `error.middleware.js`. Throw custom errors (`AuthenticationError`, `AuthorizationError`) from `utils/errors.js`.

### Frontend (Angular 20 + Material + PWA)
- **Services**: `CreatorService<T>` is the base class for entity services (Composer, Category, Publisher). Extends it for CRUD with `enrich()` endpoint support.
- **State Management**: `NavigationStateService` uses History API + sessionStorage to persist list pagination/selection across detail navigation. Call `saveState()` before navigating, `getState()` on component init.
- **API Communication**: `ApiService` is a massive facade (981 lines) centralizing all HTTP calls. Individual services like `PieceService` wrap specific operations.
- **Theming**: Dark mode support via CSS custom properties in `_dark-mode-variables.scss`. Use mixins (`@mixin readable-text`, `@mixin card-background`) for theme-aware styling.
- **Responsive Design**: Breakpoint mixins in `_breakpoints.scss` (`@mixin handset`, `@mixin tablet`). Mobile-first bottom navigation for <600px viewport.

## Critical Workflows

### Development
```bash
# Start backend (runs on port 8088)
cd choir-app-backend && npm run dev

# Start frontend (runs on port 4200)
cd choir-app-frontend && npm run startwithtimestamp

# Run backend tests (no test framework - plain assertions)
npm run test:backend
```

### Database Initialization
Backend auto-initializes on first start via `init/index.js`: migrations → schema sync → seed data. Manual commands:
```bash
npm run init --prefix choir-app-backend   # Full init with demo data
npm run seed --prefix choir-app-backend   # Seed only
```

### Testing Pattern
Backend tests use in-memory SQLite (`process.env.DB_DIALECT = 'sqlite'`, `DB_NAME = ':memory:'`). Each test file is standalone - see `tests/piece.controller.test.js` for pattern.

### Build & Deploy
Root-level scripts orchestrate monorepo:
- `npm run build` → builds frontend only
- `npm test` → frontend tests
- `npm run test:backend` → backend tests
- `deploy.ps1` → PowerShell script for production deployment via SSH

### Build Verification (Assistant Rule)
- **When the user reports build problems and asks for fixes, always run a local build afterward** to verify the errors are resolved.

### Evolving Best Practices (Assistant Rule)
- **When new best practices or rules are identified during development, add them to this `copilot-instructions.md` when requested.**

## Project-Specific Conventions

### Backend
- **Controllers**: All exports use `asyncHandler` - never write try-catch blocks in controllers.
- **Validation**: Use `express-validator` chains in `validators/` directory, apply via middleware.
- **Logging**: Inject `logger` from `config/logger.js` (Winston). Use request context for user-aware logs.
- **Environment Variables**: Loaded from `choir-app-backend/.env`. No example file exists - see README.md for required vars (`SMTP_*`, `RATE_LIMIT_MAX`, `JWT_SECRET`, `DB_*`).
- **Cache**: Monthly plans have NodeCache (60s TTL default). Invalidate on plan modifications via service methods.

### Frontend
- **Component Prefix**: `app-` (configured in angular.json).
- **SCSS Structure**: Import breakpoints/dark-mode mixins at component level. Never hardcode media queries or colors.
- **Mobile Typography**: All font sizes on mobile (handset) devices should be increased by ~10% for better readability. Use `@include responsive-font-size($desktop-size)` mixin from `_breakpoints.scss` for automatic scaling, or apply `bp.$mobile-font-scale` (1.1) to custom font sizes.
- **ViewChild Pattern**: Use setters for `@ViewChild(MatSort)` and `@ViewChild(MatPaginator)` to handle timing issues - see `literature-list.component.ts:97-112`.
- **File Structure**: Feature modules in `features/`, shared components in `shared/`, core services in `core/services/`.
- **Build Info**: `scripts/generate-build-info.js` runs pre-build to inject Git commit/timestamp into app.

### Angular Material Tables
Always use setter pattern for sort/paginator to avoid ExpressionChangedAfterItHasBeenChecked errors:
```typescript
@ViewChild(MatSort) set sort(sort: MatSort) {
  if (sort && !this.dataSource.sort) {
    this.dataSource.sort = sort;
  }
}
```

### Multi-Language Support
Limited to German UI with some English fallbacks. No i18n framework - hardcoded strings.

## Integration Points

- **Mail**: Nodemailer with database-stored templates (`mail_template` model). Admins edit via `/admin/mail-templates` endpoint.
- **File Uploads**: Multer middleware stores in `choir-app-backend/uploads/` with subdirectories per type (`piece-files/`, `collection-covers/`). Served as static files via `/uploads` route.
- **PWA**: Service worker config in `ngsw-config.json`. Auto-update notification via `ServiceWorkerUpdateService`. Icons generated by `generate-pwa-icons.py`.
- **PayPal Donations**: PDT (Payment Data Transfer) integration documented in `doc/project/PAYPAL-PDT-SETUP.md`.

## Documentation Structure

**All Markdown documentation is organized in the `doc/` directory:**

### Directory Layout
```
doc/
├── project/          # Project-wide documentation
│   ├── DOCUMENTATION-INDEX.md        # Main documentation index
│   ├── README.md                     # Project overview
│   ├── PAYPAL-PDT-SETUP.md          # PayPal integration
│   ├── SECURITY-AUDIT-LOGIN.md      # Security audit
│   ├── mobile-navigation*.md        # Mobile navigation guides
│   └── base-*-migration-guide.md    # Component migration guides
├── frontend/         # Frontend-specific docs
│   ├── API-REFACTORING-COMPLETE.md  # API refactoring guide
│   ├── DARK-MODE-*.md               # Dark mode implementation
│   ├── PERFORMANCE-OPTIMIZATIONS.md # Performance guide
│   ├── PWA-*.md                     # PWA documentation
│   └── PIPE-UTILITIES-*.md          # Pipe utilities refactoring
├── backend/          # Backend-specific docs (reserved)
├── tasks/            # Implementation task files (48 files)
│   └── mobile-nav-p*-*.md           # Mobile navigation phase tasks
└── claude/           # Temporary AI-generated files (git ignored)
```

### Documentation Guidelines
- **New Documentation**: Place in appropriate subdirectory (`project/`, `frontend/`, `backend/`)
- **Task Files**: Individual actionable tasks go in `doc/tasks/`
- **Temporary Files**: Use `doc/claude/` for experimental/temporary documentation
- **Main Index**: Start at `doc/project/DOCUMENTATION-INDEX.md` for navigation
- **Naming Convention**: `CATEGORY-SUBJECT-TYPE.md` (e.g., `API-REFACTORING-COMPLETE.md`)

### Key Documentation Files
- [doc/project/DOCUMENTATION-INDEX.md](doc/project/DOCUMENTATION-INDEX.md) - Complete documentation index
- [doc/frontend/API-REFACTORING-COMPLETE.md](doc/frontend/API-REFACTORING-COMPLETE.md) - API service refactoring patterns
- [doc/frontend/DARK-MODE-IMPLEMENTATION-CHECKLIST.md](doc/frontend/DARK-MODE-IMPLEMENTATION-CHECKLIST.md) - Dark mode guide
- [doc/frontend/PWA-QUICK-REFERENCE.md](doc/frontend/PWA-QUICK-REFERENCE.md) - PWA implementation reference
- [doc/project/mobile-navigation-checklist.md](doc/project/mobile-navigation-checklist.md) - Mobile UX checklist

## Common Gotchas

- **Port mismatch**: Backend defaults to 8088 but `environment.ts` expects 8080 - adjust `server.js` or environment file.
- **CORS**: Backend uses wildcard CORS (`cors()` middleware without config). Tighten for production.
- **JWT in headers**: Format is `Authorization: Bearer <token>`, split on space in `auth.middleware.js:9`.
- **Admin choir context**: Admins can impersonate choirs via `?choirId=X` query param (parsed in `auth.middleware.js:17`).
- **Demo user restrictions**: `requireNonDemo` middleware prevents write operations. Check `req.userRoles` array for `'demo'`.

## Key Files

- [choir-app-backend/src/app.js](choir-app-backend/src/app.js) - Express app setup, route registration
- [choir-app-backend/src/init/index.js](choir-app-backend/src/init/index.js) - Database initialization sequence
- [choir-app-frontend/src/app/core/services/creator.service.ts](choir-app-frontend/src/app/core/services/creator.service.ts) - Base CRUD service pattern
- [choir-app-frontend/src/app/core/services/navigation-state.service.ts](choir-app-frontend/src/app/core/services/navigation-state.service.ts) - Pagination/selection persistence
- [choir-app-frontend/src/themes/_breakpoints.scss](choir-app-frontend/src/themes/_breakpoints.scss) - Responsive design system
- [choir-app-frontend/src/themes/_dark-mode-variables.scss](choir-app-frontend/src/themes/_dark-mode-variables.scss) - Theme variable system

## Essential References for Agents & New Sessions

**READ THESE DOCUMENTS FIRST** before implementing changes:

### Comprehensive Architecture Guide
- [doc/project/ARCHITECTURE.md](doc/project/ARCHITECTURE.md) - **Complete system architecture documentation** covering:
  - Detailed backend & frontend architecture
  - Database schema and relationships
  - Security & authentication patterns
  - Service layer design
  - State management strategies
  - Performance optimizations
  - Testing patterns
  - Deployment architecture

### UI/UX Implementation Guidelines
- [.github/agents/ui-ux-instructions.md](.github/agents/ui-ux-instructions.md) - **Mandatory UI/UX standards** for all component development:
  - Accessibility requirements (keyboard, ARIA, contrast)
  - Responsive design patterns
  - Component state management (loading, error, empty states)
  - Design token usage
  - Animation and motion guidelines
  - Form validation patterns

### When to Consult These Documents

**ARCHITECTURE.md**: Consult when:
- Adding new features or modules
- Modifying database schema
- Implementing authentication/authorization
- Working with services or state management
- Setting up new API endpoints
- Optimizing performance
- Writing tests

**ui-ux-instructions.md**: Consult when:
- Creating or modifying Angular components
- Working with templates, styles, or UI logic
- Implementing forms, dialogs, or lists
- Adding responsive layouts
- Ensuring accessibility compliance
- Applying dark mode theming
