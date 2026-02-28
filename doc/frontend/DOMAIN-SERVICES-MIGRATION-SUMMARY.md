# Iteration 1.2: Domain Facades - Implementation Summary

**Status:** ✅ **COMPLETE**  
**Date:** 2026-02-24  
**Iteration:** 1.2 (Foundation - Domain Facades)  
**Impact:** 5/5 | **Effort:** 2/5 (documentation only) | **Risk:** 1/5

## What Was Implemented

Iteration 1.2 focused on establishing the pattern for using **direct domain services** instead of the monolithic `ApiService` facade.

### Key Achievement

**Problem Identified:**
- `ApiService` is a 1120-line facade that delegates all calls to 30+ domain services
- 50+ components inject `ApiService` unnecessarily
- Unclear dependencies (what does a component really need?)
- Poor tree-shaking (bundle includes all services even if unused)

**Solution Implemented:**
- ✅ Domain services already exist (47 specialized services)
- ✅ `ApiService` marked as `@deprecated` with clear migration guidance
- ✅ Comprehensive migration guide created
- ✅ Strategy: Strangler Pattern (gradual migration, no breaking changes)

### Files Created/Modified

#### 1. Deprecation Marker
**File:** [choir-app-frontend/src/app/core/services/api.service.ts](../choir-app-frontend/src/app/core/services/api.service.ts)

Added comprehensive `@deprecated` JSDoc comment:
- Lists all domain services with their specific use cases
- Explains benefits of direct service usage
- Points to migration guide
- Preserves backward compatibility

**Key Message:** "Use domain services directly (e.g., `PieceService`, `ComposerService`) instead of `ApiService`."

#### 2. Migration Guide
**File:** [doc/frontend/API-SERVICE-MIGRATION-GUIDE.md](API-SERVICE-MIGRATION-GUIDE.md)

Complete step-by-step guide including:
- Why migrate (benefits)
- Mapping table (ApiService method → Domain Service)
- 5-step migration process
- Complete before/after examples
- Testing migration instructions
- Multi-domain component handling
- Common pitfalls
- Progress tracking commands

**Example Migration:**
```typescript
// Before
constructor(private api: ApiService) {}
this.api.getComposers().subscribe(...);

// After
constructor(private composerService: ComposerService) {}
this.composerService.getComposers().subscribe(...);
```

**Effort:** ~10 minutes per component  
**Risk:** Very low (same API, different injection)

### Migration Strategy: Strangler Pattern

**Phase 1 (NOW):** Documentation & Deprecation ✅
- Mark `ApiService` as deprecated
- Document migration path
- Establish pattern for new code

**Phase 2 (Ongoing):** Opportunistic Migration
- New features MUST use domain services directly
- Existing code migrates when modified for other reasons
- No forced migration (backward compatible)

**Phase 3 (Future):** Completion
- When all components migrated, remove `ApiService`
- Or keep as legacy compatibility layer indefinitely

**Progress Tracking:**
```bash
# Count components still using ApiService
grep -r "private.*api.*ApiService" src/app/features --include="*.ts" | wc -l
# Initial: ~50 components
```

## Benefits Achieved

### Immediate Benefits (Week 1)

1. **Clear Direction**
   - Developers know to use domain services for new features
   - `@deprecated` warnings in IDE guide developers
   - Migration guide provides step-by-step instructions

2. **No Breaking Changes**
   - `ApiService` still works
   - Existing components unaffected
   - Zero deployment risk

3. **Better Documentation**
   - Domain services are now clearly documented
   - Mapping table shows ApiService → Service migration path
   - Examples demonstrate best practices

### Long-Term Benefits (Weeks 2-10)

4. **Smaller Bundles**
   - Tree-shaking removes unused services
   - Each component only imports what it needs
   - Estimated 5-10% bundle size reduction when fully migrated

5. **Clearer Dependencies**
   - Component constructor shows exactly what it needs
   - Easier to understand component responsibilities
   - Better code navigation

6. **Easier Testing**
   - Mock only the services a component uses (3-5 services)
   - Instead of mocking ApiService with 100+ methods
   - Faster test execution

7. **Maintainability**
   - Follows Single Responsibility Principle
   - Domain services can evolve independently
   - Easier to add new features

## Success Metrics (KPIs)

| Metric | Baseline (2026-02-24) | Target (End of Q2) | How to Measure |
|--------|----------------------|-------------------|----------------|
| Components using ApiService | ~50 | <25 | `grep -r "private.*api.*ApiService"` |
| New features using domain services | 0% | 100% | Code review enforcement |
| Bundle size reduction | - | 5-10% | `ng build --stats-json` comparison |
| Developer awareness | Low | High | Survey + IDE @deprecated warnings |

## Developer Experience

### Before (Using ApiService)
```typescript
@Component({...})
export class ComposerListComponent {
  constructor(private api: ApiService) {}  // Unclear: what does this need?
  
  loadData() {
    this.api.getComposers().subscribe(...);  // Indirect call
  }
}
```

**Issues:**
- ❌ Unclear dependencies
- ❌ Large injection (30+ services)
- ❌ Indirect method calls

### After (Using Domain Service)
```typescript
@Component({...})
export class ComposerListComponent {
  constructor(private composerService: ComposerService) {}  // ✅ Clear dependency
  
  loadData() {
    this.composerService.getComposers().subscribe(...);  // ✅ Direct call
  }
}
```

**Benefits:**
- ✅ Crystal-clear dependencies
- ✅ Small injection (only what's needed)
- ✅ Direct method calls
- ✅ Better IDE autocomplete

## For New Developers

### Onboarding Rule (NEW)

**When working with data:**
1. **Don't inject `ApiService`** (it's deprecated)
2. **Find the domain service** you need:
   - Pieces → `PieceService`
   - Composers → `ComposerService`
   - Events → `EventService`
   - etc.
3. **Inject the domain service** directly
4. **Call methods** directly on the service

**Example:**
```typescript
// ❌ Old way (deprecated)
import { ApiService } from '@core/services/api.service';
constructor(private api: ApiService) {}

// ✅ New way (preferred)
import { ComposerService } from '@core/services/composer.service';
constructor(private composerService: ComposerService) {}
```

## For Code Reviewers

### Review Checklist

When reviewing PRs:

- [ ] **New features use domain services** (not ApiService)
- [ ] **ApiService not imported** in new files
- [ ] **Migration tracked** in code comments (if migrating existing code)
- [ ] **Tests use domain service mocks** (not ApiService mock)

**Reject if:**
- ❌ New code uses `ApiService` (must use domain services)
- ❌ Migration incomplete (ApiService still injected but not used)

**Accept if:**
- ✅ Existing code still uses ApiService (migration is optional)
- ✅ New code uses domain services directly

## Available Domain Services

**Complete List (47 services):**

### Core Domain Services
- `PieceService` - Repertoire pieces (CRUD, status, notes, enrichment)
- `ComposerService` - Composers (CRUD, enrichment)
- `AuthorService` - Authors (CRUD, enrichment)
- `PublisherService` - Publishers (CRUD)
- `CategoryService` - Categories/Rubriken (CRUD)
- `CollectionService` - Collections/Chorbücher (CRUD, cover upload)

### Event & Planning
- `EventService` - Events/Services/Rehearsals (CRUD)
- `MonthlyPlanService` - Monthly plans (CRUD, finalize, PDF)
- `PlanEntryService` - Plan entries (CRUD)
- `PlanRuleService` - Planning rules (CRUD)
- `AvailabilityService` - Member availability (CRUD)

### User & Auth
- `UserService` - User profiles (CRUD, roles)
- `AuthService` - Authentication (login, logout, register)
- `ChoirService` - Choirs (CRUD, members)

### Library & Lending
- `LibraryService` - Library items (CRUD, borrow, return)
- `ChoirLendingService` - Inter-choir lending
- `LoanCartService` - Loan cart management

### Communication
- `PostService` - Posts/News (CRUD)
- `NotificationService` - Push notifications

### Admin & System
- `AdminService` - Admin functions (users, global data)
- `SystemService` - System config (mail, templates)
- `DistrictService` - Districts (CRUD)
- `CongregationService` - Congregations (CRUD)

### Utility Services
- `SearchService` - Global search
- `ImportService` - CSV imports
- `FilterPresetService` - Filter presets
- `ProgramService` - Programs
- `PayPalService` - PayPal donations

### Infrastructure Services
- `NavigationStateService` - Pagination/selection persistence
- `ThemeService` - Dark mode
- `LoadingService` - Loading indicators
- `ErrorService` - Error handling
- `ImageCacheService` - Image caching
- `IndexedDbCacheService` - Offline caching

**See:** [services/](../choir-app-frontend/src/app/core/services/) directory for full list.

## Next Steps

### For Developers

1. **Read migration guide:** [API-SERVICE-MIGRATION-GUIDE.md](API-SERVICE-MIGRATION-GUIDE.md)
2. **Use domain services** in new features (MANDATORY)
3. **Migrate opportunistically** when touching existing code (OPTIONAL)

### For Team Leads

1. **Communicate new pattern** to team (domain services, not ApiService)
2. **Update code review guidelines** (reject new ApiService usage)
3. **Track migration progress** (monthly check-in)
4. **Celebrate wins** (each migrated component is progress)

### For Project Management

1. **Accept gradual migration** (no deadline, no forced migration)
2. **Enforce for new code** (all new features use domain services)
3. **Monitor bundle size** (should decrease over time)
4. **Plan Iteration 2** (Modular routing, next phase)

## Related Documentation

- **Migration Guide:** [API-SERVICE-MIGRATION-GUIDE.md](API-SERVICE-MIGRATION-GUIDE.md)
- **API Refactoring:** [API-REFACTORING-COMPLETE.md](API-REFACTORING-COMPLETE.md)
- **Creator Service Pattern:** [creator.service.ts](../choir-app-frontend/src/app/core/services/creator.service.ts)
- **Project Roadmap:** [OPENCLAW-PATTERNS-ROADMAP.md](../project/OPENCLAW-PATTERNS-ROADMAP.md)
- **Architecture:** [ARCHITECTURE.md](../project/ARCHITECTURE.md)

## Lessons Learned

### What Went Well
- ✅ Domain services already existed (previous refactoring)
- ✅ No breaking changes required (backward compatible)
- ✅ Clear migration path documented
- ✅ Low-risk, high-value improvement

### Challenges
- ⚠️  50+ components to migrate (large scope)
- ⚠️  Need team buy-in for new pattern
- ⚠️  IDE warnings might annoy developers initially

### Solutions
- ✅ Strangler pattern (gradual migration)
- ✅ Comprehensive documentation
- ✅ Enforce for new code, optional for old code

---

**Status:** ✅ **Iteration 1.2 complete**  
**Impact:** High (establishes pattern for all future development)  
**Effort:** Low (documentation only, no code changes required)  
**Risk:** Minimal (backward compatible, gradual adoption)  
**Next:** Iteration 2.1 - Modular Route Mounting (Backend)

**Migration Progress:** 0/50 components (0%) - **New features MUST use domain services**
