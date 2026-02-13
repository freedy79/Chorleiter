# Chorleiter - System Architecture Documentation

**Version:** 2.0  
**Last Updated:** Februar 2026  
**Status:** Living Document

---

## Inhaltsverzeichnis

1. [System Overview](#system-overview)
2. [Architecture Principles](#architecture-principles)
3. [Backend Architecture](#backend-architecture)
4. [Frontend Architecture](#frontend-architecture)
5. [Database Architecture](#database-architecture)
6. [Security Architecture](#security-architecture)
7. [API Design](#api-design)
8. [State Management](#state-management)
9. [File Management](#file-management)
10. [Deployment Architecture](#deployment-architecture)
11. [Performance Considerations](#performance-considerations)
12. [Testing Strategy](#testing-strategy)

---

## System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Client Layer                          │
│  Angular 20 PWA + Material Design + Service Worker      │
│  Port: 4200 (dev) / 443 (prod via nginx)                │
└──────────────────┬──────────────────────────────────────┘
                   │ HTTPS/REST
                   │ JWT Bearer Token
┌──────────────────▼──────────────────────────────────────┐
│                   API Layer                              │
│  Node.js/Express + express-validator + cors             │
│  Port: 8088 (configurable)                              │
└──────────────────┬──────────────────────────────────────┘
                   │ Sequelize ORM
┌──────────────────▼──────────────────────────────────────┐
│                Database Layer                            │
│  PostgreSQL (prod) / SQLite (test)                      │
│  Connection pooling, migrations, seeders                │
└─────────────────────────────────────────────────────────┘

External Integrations:
├─ SMTP (Nodemailer) - Mail dispatch
├─ PayPal PDT - Donation processing
└─ File System - Static file uploads
```

### Monorepo Structure

```
Chorleiter/
├── choir-app-backend/     # Node.js REST API
├── choir-app-frontend/    # Angular 20 SPA
├── doc/                   # Documentation
├── scripts/               # Build & deployment scripts
└── package.json           # Root orchestration scripts
```

**Design Philosophy**: Separate concerns, shared coordination. Backend and frontend are independently deployable but coordinated through root-level scripts for development and deployment.

---

## Architecture Principles

### Core Principles

1. **Convention over Configuration**
   - Standardized patterns (Creator services, base components)
   - Middleware stack follows defined order
   - File structure mirrors feature boundaries

2. **Security First**
   - JWT-based authentication on all protected routes
   - Dual-level authorization (global + choir-specific roles)
   - Input validation via express-validator
   - SQL injection prevention through Sequelize ORM

3. **Progressive Web App**
   - Offline-first capabilities
   - Service worker caching strategies
   - Responsive design with mobile-first approach

4. **Maintainability**
   - Centralized error handling
   - Consistent logging with request context
   - Self-documenting code patterns
   - Comprehensive test coverage for critical paths

5. **Performance**
   - Lazy loading for Angular modules
   - Database query optimization
   - Strategic caching (NodeCache for plans)
   - Optimistic UI updates

---

## Backend Architecture

### Technology Stack

- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **ORM**: Sequelize (PostgreSQL/SQLite)
- **Auth**: JWT (jsonwebtoken)
- **Validation**: express-validator
- **Logging**: Winston
- **Mail**: Nodemailer
- **File Uploads**: Multer
- **Caching**: node-cache

### Directory Structure

```
choir-app-backend/
├── src/
│   ├── app.js                    # Express app setup
│   ├── config/
│   │   ├── database.js           # DB connection config
│   │   ├── logger.js             # Winston configuration
│   │   └── requestContext.js     # Async local storage
│   ├── controllers/              # Request handlers (asyncHandler wrapped)
│   ├── middleware/
│   │   ├── auth.middleware.js    # JWT verification + role checks
│   │   ├── error.middleware.js   # Centralized error handling
│   │   ├── rateLimiter.js        # Rate limiting
│   │   └── requestContext.js     # Request context middleware
│   ├── models/                   # Sequelize models
│   │   └── index.js              # Model associations
│   ├── routes/                   # Express routes
│   ├── services/                 # Business logic layer
│   ├── utils/                    # Shared utilities
│   │   ├── errors.js             # Custom error classes
│   │   └── fuzzy-matching.js     # Import matching logic
│   └── validators/               # express-validator chains
├── tests/                        # Unit & integration tests
├── uploads/                      # User-uploaded files
│   ├── piece-files/
│   ├── collection-covers/
│   └── ...
└── server.js                     # Entry point
```

### Middleware Stack Pattern

**Critical Order** (defined in `app.js`):

```javascript
app.use(cors())                      // 1. CORS headers
app.use(express.json())              // 2. JSON body parsing
app.use(runWithRequestContext)       // 3. Request context storage
app.use('/api/*', verifyToken)       // 4. JWT verification
app.use('/api/admin/*', requireAdmin) // 5. Role-based access
// ... routes
app.use(errorHandler)                // Last: Error handling
```

**Auth Middleware Chain**:
- `verifyToken` → Validates JWT, sets `req.userId`, `req.userRoles`, `req.choirId`
- `requireNonDemo` → Blocks write operations for demo users
- `requireAdmin` / `requireDirector` / `requireLibrarian` → Role checks

### Service Layer Pattern

**Example**: `piece.service.js`

```javascript
const pieceService = {
  // Business logic encapsulation
  async getPieceById(id, choirId) {
    // Authorization + data retrieval + enrichment
  },
  
  async createPiece(data, userId, choirId) {
    // Validation + creation + related entities
  }
}
```

**Key Services**:
- `creator.service.js` - Generic CRUD for composers/publishers/categories
- `email.service.js` - Mail dispatch with template management
- `holiday.service.js` - German holiday calculations
- `log.service.js` - Audit logging with request context
- `notification.service.js` - In-app notifications

### Error Handling Architecture

**Custom Error Classes** (`utils/errors.js`):
```javascript
class ValidationError extends Error { statusCode = 400 }
class AuthenticationError extends Error { statusCode = 401 }
class AuthorizationError extends Error { statusCode = 403 }
class NotFoundError extends Error { statusCode = 404 }
```

**Centralized Handler** (`middleware/error.middleware.js`):
- Maps error types to HTTP status codes
- Sanitizes error messages for production
- Logs errors with request context
- Returns consistent JSON structure

### Database Initialization Flow

```
Application Start
    ↓
init/index.js
    ↓
├─ migrations/        (schema changes)
├─ models sync        (Sequelize sync)
└─ seeders/           (demo data)
    ↓
Server Ready
```

**Commands**:
```bash
npm run init          # Full initialization
npm run seed          # Seed data only
npm run migrate       # Migrations only
```

---

## Frontend Architecture

### Technology Stack

- **Framework**: Angular 20 (standalone components)
- **UI Library**: Angular Material
- **PWA**: @angular/service-worker
- **Styling**: SCSS with design token system
- **Build**: Angular CLI + Webpack
- **State**: Services + RxJS (no NgRx)

### Directory Structure

```
choir-app-frontend/src/
├── app/
│   ├── core/                        # Singleton services
│   │   ├── services/
│   │   │   ├── api.service.ts       # HTTP facade (981 lines)
│   │   │   ├── auth.service.ts      # JWT + user state
│   │   │   ├── creator.service.ts   # Base CRUD pattern
│   │   │   ├── navigation-state.service.ts # List state persistence
│   │   │   └── ...
│   │   ├── guards/                  # Route guards
│   │   └── interceptors/            # HTTP interceptors
│   ├── features/                    # Feature modules (lazy-loaded)
│   │   ├── literature/              # Piece management
│   │   ├── collections/
│   │   ├── programs/
│   │   ├── events/
│   │   └── ...
│   ├── shared/                      # Shared components/pipes/directives
│   │   ├── components/
│   │   │   ├── base-dialog/         # Dialog base class
│   │   │   ├── base-list/           # List base class
│   │   │   └── ...
│   │   ├── pipes/                   # Utility pipes
│   │   └── models/                  # TypeScript interfaces
│   └── app.component.ts             # Root component
├── themes/                          # SCSS design system
│   ├── _breakpoints.scss            # Responsive mixins
│   ├── _dark-mode-variables.scss    # Theme tokens
│   ├── custom-material-theme.scss   # Material customization
│   └── styles.scss                  # Global styles
└── environments/                    # Environment configs
```

### Component Architecture Patterns

#### 1. Base Component Pattern

**Base List Component** (`shared/components/base-list/`):
```typescript
export abstract class BaseListComponent<T> implements OnInit, AfterViewInit {
  @ViewChild(MatSort) set sort(sort: MatSort) { /* setter pattern */ }
  @ViewChild(MatPaginator) set paginator(pag: MatPaginator) { /* setter pattern */ }
  
  dataSource: MatTableDataSource<T>;
  abstract displayedColumns: string[];
  
  // Template method pattern
  abstract loadData(): void;
  abstract getItemName(item: T): string;
}
```

**Usage**: All list components extend `BaseListComponent` for consistency.

#### 2. Creator Service Pattern

**Base Service** (`core/services/creator.service.ts`):
```typescript
export abstract class CreatorService<T> {
  constructor(
    protected apiService: ApiService,
    protected endpoint: string
  ) {}
  
  getAll(choirId: number): Observable<T[]>
  create(item: T, choirId: number): Observable<T>
  update(id: number, item: T, choirId: number): Observable<T>
  delete(id: number, choirId: number): Observable<void>
  enrich(choirId: number): Observable<EnrichmentResult> // AI-powered
}
```

**Implementations**: `ComposerService`, `PublisherService`, `CategoryService`

#### 3. Dialog Pattern

**Base Dialog** (`shared/components/base-dialog/`):
```typescript
export abstract class BaseDialogComponent<T> {
  constructor(
    public dialogRef: MatDialogRef<BaseDialogComponent<T>>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData<T>
  ) {}
  
  abstract initForm(): FormGroup;
  abstract onSave(): void;
}
```

### State Management Strategy

**No Global State Store**. Instead:

1. **Service-based State**:
   ```typescript
   @Injectable({ providedIn: 'root' })
   export class ChoirService {
     private currentChoirSubject = new BehaviorSubject<Choir | null>(null);
     currentChoir$ = this.currentChoirSubject.asObservable();
   }
   ```

2. **Navigation State Persistence**:
   ```typescript
   // Before navigation
   this.navigationState.saveState('literature', {
     pageIndex: 0,
     pageSize: 25,
     selectedId: 42
   });
   
   // After return
   const state = this.navigationState.getState('literature');
   ```

3. **URL as State**:
   - Query params for filters (`?search=Mozart&category=5`)
   - Route params for entities (`/pieces/:id`)

### Responsive Design System

**Breakpoint Mixins** (`themes/_breakpoints.scss`):
```scss
@mixin handset { @media (max-width: 599px) { @content; } }
@mixin tablet { @media (min-width: 600px) and (max-width: 959px) { @content; } }
@mixin desktop { @media (min-width: 960px) { @content; } }
```

**Mobile Navigation Pattern**:
- Desktop: Drawer + top toolbar
- Mobile (<600px): Bottom navigation + floating action button

### Dark Mode Architecture

**Theme Token System** (`themes/_dark-mode-variables.scss`):
```scss
:root {
  --background-color: #fafafa;
  --text-primary: rgba(0, 0, 0, 0.87);
  // ... light theme
}

.dark-mode {
  --background-color: #303030;
  --text-primary: rgba(255, 255, 255, 0.87);
  // ... dark theme
}
```

**Theme Service**:
```typescript
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private isDarkMode = new BehaviorSubject<boolean>(false);
  
  toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
  }
}
```

---

## Database Architecture

### Schema Overview

**Core Entities**:
```
User ──┬── UserChoir ──── Choir ──┬── Piece ──┬── Collection
       │                          │           │
       │                          │           └── PieceFile
       │                          │
       │                          ├── Event ──── EventPiece
       │                          │
       │                          ├── Program ──── ProgramPiece
       │                          │
       │                          └── MonthlyPlan ──── PlanWeek ──── WeekPiece
       │
       └── JoinRequest
```

### Key Relationships

**Many-to-Many with Metadata**:
- `UserChoir` - Links users to choirs with `rolesInChoir` array
- `EventPiece` - Links events to pieces with order and notes
- `ProgramPiece` - Links programs to pieces with sequence
- `WeekPiece` - Links plan weeks to pieces

**Polymorphic Associations**:
- `Piece` has `composerId`, `publisherId`, `categoryId` (optional)
- Cascade deletes configured to maintain referential integrity

### Sequelize Model Pattern

**Model Definition** (`models/piece.js`):
```javascript
module.exports = (sequelize, DataTypes) => {
  const Piece = sequelize.define('Piece', {
    title: { type: DataTypes.STRING, allowNull: false },
    choirId: { type: DataTypes.INTEGER, allowNull: false },
    // ... fields
  }, {
    tableName: 'pieces',
    timestamps: true,
    paranoid: true  // Soft delete with deletedAt
  });
  
  Piece.associate = (models) => {
    Piece.belongsTo(models.Choir, { foreignKey: 'choirId' });
    Piece.belongsTo(models.Composer, { foreignKey: 'composerId' });
    // ... associations
  };
  
  return Piece;
};
```

**Association Setup** (`models/index.js`):
```javascript
// Load all models
const models = { User, Choir, Piece, /* ... */ };

// Execute associations
Object.values(models).forEach(model => {
  if (model.associate) {
    model.associate(models);
  }
});
```

### Migration Strategy

**Schema Changes**:
1. Create migration file: `migrations/YYYYMMDDHHMMSS-description.js`
2. Define `up` and `down` methods
3. Run: `npm run migrate`

**Seed Data**:
- Demo users, choirs, and sample data in `init/seeders/`
- Executed via `npm run seed`

### Dual Database Support

**PostgreSQL (Production)**:
```javascript
{
  dialect: 'postgres',
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  pool: { max: 10, min: 0, acquire: 30000, idle: 10000 }
}
```

**SQLite (Testing)**:
```javascript
{
  dialect: 'sqlite',
  storage: ':memory:',
  logging: false
}
```

**Test Pattern**:
```javascript
process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';
const { sequelize } = require('../src/models');
await sequelize.sync({ force: true }); // Fresh schema per test
```

---

## Security Architecture

### Authentication Flow

```
1. User Login (POST /api/auth/login)
   ↓
2. Credentials Validation
   ↓
3. JWT Generation (24h expiry)
   {
     userId: number,
     roles: string[],    // ['admin', 'demo']
     choirId?: number    // Optional default choir
   }
   ↓
4. Token Return to Client
   ↓
5. Client Stores in localStorage
   ↓
6. Subsequent Requests (Authorization: Bearer <token>)
   ↓
7. verifyToken Middleware Validates
   ↓
8. req.userId, req.userRoles populated
```

### Authorization Model

**Dual-Level Roles**:

1. **Global Roles** (in JWT, user table):
   - `admin` - Full system access
   - `demo` - Read-only demo account
   - (regular user - no global role)

2. **Choir-Specific Roles** (in `user_choir.rolesInChoir`):
   - `director` - Can manage pieces, events, programs
   - `librarian` - Can manage file uploads
   - (member - no choir role, read-only)

**Middleware Checks**:
```javascript
// Global admin
requireAdmin(req, res, next) {
  if (!req.userRoles.includes('admin')) throw new AuthorizationError();
}

// Choir-specific director
async requireDirector(req, res, next) {
  const choirId = req.params.choirId || req.query.choirId;
  const userChoir = await UserChoir.findOne({ 
    where: { userId: req.userId, choirId } 
  });
  if (!userChoir.rolesInChoir.includes('director')) {
    throw new AuthorizationError();
  }
}

// Demo user restriction (write operations)
requireNonDemo(req, res, next) {
  if (req.userRoles.includes('demo')) {
    throw new AuthorizationError('Demo users cannot modify data');
  }
}
```

### Input Validation

**express-validator Pattern**:
```javascript
// validators/piece.validators.js
const createPieceValidation = [
  body('title').trim().notEmpty().withMessage('Title required'),
  body('choirId').isInt().withMessage('Invalid choir ID'),
  body('composerId').optional().isInt(),
  // ... more validations
];

// routes/pieces.js
router.post('/', 
  verifyToken,
  requireNonDemo,
  createPieceValidation,
  handleValidationErrors,
  pieceController.create
);
```

### XSS & Injection Prevention

- **SQL Injection**: Prevented by Sequelize parameterized queries
- **XSS**: Frontend sanitizes user input in templates (Angular's default)
- **CSRF**: Not applicable (stateless JWT, no cookies)
- **File Upload**: Whitelist extensions, size limits, storage isolation

### Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100
});

app.use('/api/', limiter);
```

---

## API Design

### REST Conventions

**Endpoint Pattern**:
```
GET    /api/pieces              - List all pieces for choir
GET    /api/pieces/:id          - Get single piece
POST   /api/pieces              - Create piece
PUT    /api/pieces/:id          - Update piece
DELETE /api/pieces/:id          - Delete piece
POST   /api/pieces/enrich       - AI enrichment endpoint
```

**Query Parameters**:
- `choirId` - Choir context (required for most endpoints)
- `search` - Text search
- `category` - Filter by category ID
- `limit` / `offset` - Pagination

**Request/Response Format**:
```json
// Success Response
{
  "success": true,
  "data": { /* ... */ },
  "message": "Operation successful"
}

// Error Response
{
  "success": false,
  "error": "Validation failed",
  "details": [ /* validation errors */ ]
}
```

### ApiService Facade (Frontend)

**Centralized HTTP Client** (`core/services/api.service.ts`):
```typescript
@Injectable({ providedIn: 'root' })
export class ApiService {
  // 981 lines - all HTTP calls go through here
  
  getPieces(choirId: number): Observable<Piece[]> {
    return this.http.get<Piece[]>(`${API_URL}/pieces?choirId=${choirId}`);
  }
  
  createPiece(piece: Piece, choirId: number): Observable<Piece> {
    return this.http.post<Piece>(`${API_URL}/pieces`, { ...piece, choirId });
  }
  
  // ... 100+ API methods
}
```

**Service Wrappers**:
```typescript
@Injectable({ providedIn: 'root' })
export class PieceService {
  constructor(private api: ApiService) {}
  
  getAll(choirId: number) {
    return this.api.getPieces(choirId);
  }
  
  // Higher-level operations
  duplicatePiece(id: number, choirId: number) {
    return this.api.duplicatePiece(id, choirId).pipe(
      tap(() => this.invalidateCache()),
      catchError(this.handleError)
    );
  }
}
```

---

## State Management

### Navigation State Pattern

**Problem**: Maintain list pagination/selection when navigating to detail view and back.

**Solution**: `NavigationStateService`

```typescript
// In list component (before navigation)
this.navigationState.saveState('literature', {
  pageIndex: this.paginator.pageIndex,
  pageSize: this.paginator.pageSize,
  selectedId: piece.id,
  filters: this.filterForm.value
});

this.router.navigate(['/literature', piece.id]);

// In list component (after return)
ngOnInit() {
  const state = this.navigationState.getState('literature');
  if (state) {
    this.paginator.pageIndex = state.pageIndex;
    this.paginator.pageSize = state.pageSize;
    // Restore filters, scroll to selected item
  }
}
```

**Storage Mechanism**: History API + sessionStorage fallback

### Form State Management

**Reactive Forms Pattern**:
```typescript
export class PieceFormComponent {
  form: FormGroup;
  
  ngOnInit() {
    this.form = this.fb.group({
      title: ['', [Validators.required]],
      composer: [null],
      voices: this.fb.array([])
    });
    
    // Load existing data
    if (this.pieceId) {
      this.pieceService.getById(this.pieceId).subscribe(piece => {
        this.form.patchValue(piece);
      });
    }
  }
  
  onSubmit() {
    if (this.form.valid) {
      const piece = this.form.value;
      // Optimistic update
      this.pieceService.save(piece).subscribe();
    }
  }
}
```

---

## File Management

### Upload Architecture

**Backend** (`middleware/upload.js`):
```javascript
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/piece-files');
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.jpg', '.png', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowedTypes.includes(ext));
  }
});
```

**Storage Structure**:
```
uploads/
├── piece-files/           # Music scores, lyrics
├── collection-covers/     # Album artwork
├── event-attachments/     # Event documents
└── program-covers/        # Program booklet covers
```

**Serving Files**:
```javascript
app.use('/uploads', express.static('uploads'));
```

**Frontend Upload**:
```typescript
uploadFile(file: File, pieceId: number) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('pieceId', pieceId.toString());
  
  return this.http.post(`${API_URL}/pieces/upload`, formData, {
    reportProgress: true,
    observe: 'events'
  }).pipe(
    filter(event => event.type === HttpEventType.UploadProgress),
    map(event => Math.round(100 * event.loaded / event.total))
  );
}
```

---

## Deployment Architecture

### Production Environment

```
┌──────────────────────────────────────────────┐
│           Nginx Reverse Proxy                │
│  - SSL termination (Let's Encrypt)           │
│  - Static file serving                       │
│  - Gzip compression                          │
└───────────┬────────────────┬─────────────────┘
            │                │
    ┌───────▼────────┐   ┌──▼──────────────┐
    │   Frontend     │   │    Backend      │
    │  (Angular)     │   │  (Node/Express) │
    │  Port: 4200    │   │  Port: 8088     │
    │  Built static  │   │  PM2 managed    │
    └────────────────┘   └────────┬────────┘
                                  │
                         ┌────────▼─────────┐
                         │   PostgreSQL     │
                         │   Port: 5432     │
                         └──────────────────┘
```

### Deployment Process

**PowerShell Script** (`deploy.ps1`):
```powershell
# 1. Build frontend
cd choir-app-frontend
npm run build

# 2. SSH to server
ssh user@server

# 3. Git pull
git pull origin main

# 4. Install dependencies
npm ci --prefix choir-app-backend
npm ci --prefix choir-app-frontend

# 5. Build frontend (production)
cd choir-app-frontend
npm run build

# 6. Restart backend
pm2 restart choir-app-backend

# 7. Database migrations
npm run migrate --prefix choir-app-backend
```

### Environment Configuration

**Backend** (`.env`):
```bash
NODE_ENV=production
PORT=8088
JWT_SECRET=<secret>
DB_HOST=localhost
DB_PORT=5432
DB_NAME=chorleiter
DB_USER=<user>
DB_PASSWORD=<password>
SMTP_HOST=<host>
SMTP_PORT=587
SMTP_USER=<user>
SMTP_PASSWORD=<password>
RATE_LIMIT_MAX=100
```

**Frontend** (`environment.prod.ts`):
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://chorleiter.app/api',
  enablePWA: true
};
```

---

## Performance Considerations

### Backend Optimizations

1. **Database**:
   - Connection pooling (max: 10 connections)
   - Eager loading for associations (avoid N+1)
   - Indexes on foreign keys and search fields

2. **Caching**:
   ```javascript
   const NodeCache = require('node-cache');
   const cache = new NodeCache({ stdTTL: 60 });
   
   async getMonthlyPlan(id) {
     const cached = cache.get(`plan-${id}`);
     if (cached) return cached;
     
     const plan = await MonthlyPlan.findByPk(id);
     cache.set(`plan-${id}`, plan);
     return plan;
   }
   ```

3. **Compression**:
   ```javascript
   const compression = require('compression');
   app.use(compression());
   ```

### Frontend Optimizations

1. **Lazy Loading**:
   ```typescript
   const routes: Routes = [
     {
       path: 'literature',
       loadChildren: () => import('./features/literature/literature.module')
         .then(m => m.LiteratureModule)
     }
   ];
   ```

2. **OnPush Change Detection**:
   ```typescript
   @Component({
     selector: 'app-piece-list',
     changeDetection: ChangeDetectionStrategy.OnPush
   })
   ```

3. **Virtual Scrolling** (for large lists):
   ```html
   <cdk-virtual-scroll-viewport itemSize="50">
     <div *cdkVirtualFor="let piece of pieces">
       {{ piece.title }}
     </div>
   </cdk-virtual-scroll-viewport>
   ```

4. **PWA Caching**:
   ```json
   // ngsw-config.json
   {
     "dataGroups": [
       {
         "name": "api-pieces",
         "urls": ["/api/pieces*"],
         "cacheConfig": {
           "maxAge": "1h",
           "strategy": "freshness"
         }
       }
     ]
   }
   ```

---

## Testing Strategy

### Backend Testing

**Pattern** (No test framework - plain assertions):
```javascript
// tests/piece.controller.test.js
async function testCreatePiece() {
  const piece = await pieceController.create({
    body: { title: 'Test', choirId: 1 }
  });
  
  assert(piece.title === 'Test', 'Title mismatch');
  console.log('✓ testCreatePiece passed');
}

// Run all tests
async function runTests() {
  await testCreatePiece();
  await testUpdatePiece();
  // ...
}
```

**Database Setup**:
```javascript
beforeEach(async () => {
  process.env.DB_DIALECT = 'sqlite';
  process.env.DB_NAME = ':memory:';
  const { sequelize } = require('../src/models');
  await sequelize.sync({ force: true }); // Fresh DB per test
});
```

### Frontend Testing

**Karma + Jasmine**:
```typescript
describe('PieceService', () => {
  let service: PieceService;
  let httpMock: HttpTestingController;
  
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PieceService]
    });
    service = TestBed.inject(PieceService);
    httpMock = TestBed.inject(HttpTestingController);
  });
  
  it('should fetch pieces', () => {
    service.getAll(1).subscribe(pieces => {
      expect(pieces.length).toBe(2);
    });
    
    const req = httpMock.expectOne('/api/pieces?choirId=1');
    req.flush([{ id: 1 }, { id: 2 }]);
  });
});
```

### E2E Testing

Currently not implemented. Planned: Playwright for critical user journeys.

---

## Additional Resources

### Related Documentation

- **UI/UX Guidelines**: See [.github/agents/ui-ux-instructions.md](../../.github/agents/ui-ux-instructions.md) for comprehensive UI/UX implementation guidelines
- **API Refactoring**: [frontend/API-REFACTORING-COMPLETE.md](../frontend/API-REFACTORING-COMPLETE.md)
- **Dark Mode**: [frontend/DARK-MODE-IMPLEMENTATION-CHECKLIST.md](../frontend/DARK-MODE-IMPLEMENTATION-CHECKLIST.md)
- **PWA Setup**: [frontend/PWA-QUICK-REFERENCE.md](../frontend/PWA-QUICK-REFERENCE.md)
- **Documentation Index**: [project/DOCUMENTATION-INDEX.md](DOCUMENTATION-INDEX.md)

### Key Decision Records

1. **Why Monorepo?**
   - Simplifies version synchronization
   - Shared deployment scripts
   - Easier cross-stack refactoring

2. **Why No NgRx?**
   - App complexity doesn't justify the overhead
   - Service-based state is sufficient
   - Reduces bundle size

3. **Why Dual Database Support?**
   - SQLite for fast, isolated tests
   - PostgreSQL for production reliability
   - Same Sequelize API for both

4. **Why ApiService Facade?**
   - Centralized HTTP error handling
   - Easier to mock for testing
   - Consistent authorization header injection

---

## Maintenance Notes

### When Adding New Features

1. **Backend**:
   - Create model in `src/models/`
   - Define associations in model's `associate()` method
   - Create controller in `src/controllers/` (use `asyncHandler`)
   - Add validators in `src/validators/`
   - Register routes in `src/routes/`
   - Update `init/seeders/` for demo data

2. **Frontend**:
   - Create feature module in `features/`
   - Extend `BaseListComponent` for lists
   - Use `CreatorService<T>` pattern if entity is a "creator type"
   - Add API methods to `ApiService`
   - Update navigation in `app.component.ts`

### Migration Checklist

- [ ] Database migration file created
- [ ] Model associations updated
- [ ] Seeders updated
- [ ] Backend tests written
- [ ] Frontend service created
- [ ] Components created
- [ ] Routes configured
- [ ] Documentation updated

---

**Document Status**: Active  
**Maintainer**: Development Team  
**Review Frequency**: Quarterly or on major architectural changes
