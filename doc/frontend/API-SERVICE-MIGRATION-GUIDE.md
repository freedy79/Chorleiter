# API Service Migration Guide

**Status:** Active Migration  
**Priority:** Medium (New features MUST use domain services, existing code can migrate opportunistically)  
**Effort:** Low per component (~10-30 minutes)

## Overview

The `ApiService` is a legacy facade service that delegates all calls to specialized domain services. While functional, it creates unnecessary indirection and prevents effective tree-shaking.

**Goal:** Migrate components from `ApiService` to direct domain service usage.

## Why Migrate?

### Current Problem (using ApiService)

```typescript
@Component({...})
export class ComposerListComponent {
  constructor(private api: ApiService) {}  // ❌ Injecting 30+ services

  ngOnInit() {
    this.api.getComposers().subscribe(...);  // Delegates to ComposerService anyway
  }
}
```

**Issues:**
- ❌ Unclear dependencies (what does this component really need?)
- ❌ Large bundle size (ApiService pulls in 30+ services)
- ❌ Harder to test (need to mock ApiService with 100+ methods)
- ❌ Violates Single Responsibility Principle

### After Migration (using Domain Service)

```typescript
@Component({...})
export class ComposerListComponent {
  constructor(private composerService: ComposerService) {}  // ✅ Clear dependency

  ngOnInit() {
    this.composerService.getComposers().subscribe(...);
  }
}
```

**Benefits:**
- ✅ Clear dependencies (I only need ComposerService)
- ✅ Smaller bundle (tree-shaking removes unused services)
- ✅ Easier to test (mock only ComposerService)
- ✅ Follows Best Practices

## Migration Steps

### Step 1: Identify Domain Services Needed

Look at your component's `api.` calls and map them to domain services:

| ApiService Method | Domain Service | Import |
|-------------------|----------------|--------|
| `api.getComposers()` | `ComposerService` | `@core/services/composer.service` |
| `api.createComposer()` | `ComposerService` | `@core/services/composer.service` |
| `api.getAuthors()` | `AuthorService` | `@core/services/author.service` |
| `api.getPublishers()` | `PublisherService` | `@core/services/publisher.service` |
| `api.getCategories()` | `CategoryService` | `@core/services/category.service` |
| `api.getMyRepertoire()` | `PieceService` | `@core/services/piece.service` |
| `api.getCollections()` | `CollectionService` | `@core/services/collection.service` |
| `api.getEvents()` | `EventService` | `@core/services/event.service` |
| `api.getMonthlyPlan()` | `MonthlyPlanService` | `@core/services/monthly-plan.service` |
| `api.getChoirs()` | `ChoirService` | `@core/services/choir.service` |
| `api.getCurrentUser()` | `UserService` | `@core/services/user.service` |
| `api.login()` | `AuthService` | `@core/services/auth.service` |
| `api.searchAll()` | `SearchService` | `@core/services/search.service` |
| `api.getLibraryItems()` | `LibraryService` | `@core/services/library.service` |
| `api.createPost()` | `PostService` | `@core/services/post.service` |
| `api.getPrograms()` | `ProgramService` | `@core/services/program.service` |
| `api.getDistricts()` | `DistrictService` | `@core/services/district.service` |
| `api.getCongregations()` | `CongregationService` | `@core/services/congregation.service` |
| `api.getPlanRules()` | `PlanRuleService` | `@core/services/plan-rule.service` |
| `api.getAvailabilities()` | `AvailabilityService` | `@core/services/availability.service` |

**See full mapping:** [`api.service.ts`](../../choir-app-frontend/src/app/core/services/api.service.ts) deprecation comments

### Step 2: Update Imports

**Before:**
```typescript
import { ApiService } from '@core/services/api.service';
```

**After:**
```typescript
import { ComposerService } from '@core/services/composer.service';
import { AuthorService } from '@core/services/author.service';
// Import only what you need
```

### Step 3: Update Constructor

**Before:**
```typescript
constructor(
  private api: ApiService,
  private notification: NotificationService
) {}
```

**After:**
```typescript
constructor(
  private composerService: ComposerService,
  private authorService: AuthorService,
  private notification: NotificationService
) {}
```

### Step 4: Update Method Calls

**Before:**
```typescript
this.api.getComposers().subscribe(composers => {
  this.dataSource.data = composers;
});
```

**After:**
```typescript
this.composerService.getComposers().subscribe(composers => {
  this.dataSource.data = composers;
});
```

### Step 5: Update Tests

**Before:**
```typescript
const apiSpy = jasmine.createSpyObj('ApiService', ['getComposers', 'createComposer', ...]);
TestBed.configureTestingModule({
  providers: [{ provide: ApiService, useValue: apiSpy }]
});
```

**After:**
```typescript
const composerSpy = jasmine.createSpyObj('ComposerService', ['getComposers', 'createComposer']);
TestBed.configureTestingModule({
  providers: [{ provide: ComposerService, useValue: composerSpy }]
});
```

## Complete Example: Composer List Component

### Before Migration

```typescript
// composer-list.component.ts
import { Component, OnInit } from '@angular/core';
import { ApiService } from '@core/services/api.service';
import { Composer } from '@core/models/composer';

@Component({
  selector: 'app-composer-list',
  templateUrl: './composer-list.component.html'
})
export class ComposerListComponent implements OnInit {
  composers: Composer[] = [];

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadComposers();
  }

  loadComposers() {
    this.api.getComposers().subscribe({
      next: (composers) => {
        this.composers = composers;
      },
      error: (err) => console.error(err)
    });
  }

  deleteComposer(id: number) {
    this.api.deleteComposer(id).subscribe({
      next: () => {
        this.loadComposers();
      }
    });
  }

  enrichComposer(id: number) {
    this.api.enrichComposer(id).subscribe({
      next: (composer) => {
        // Update composer in list
        const index = this.composers.findIndex(c => c.id === id);
        if (index !== -1) {
          this.composers[index] = composer;
        }
      }
    });
  }
}
```

### After Migration

```typescript
// composer-list.component.ts
import { Component, OnInit } from '@angular/core';
import { ComposerService } from '@core/services/composer.service';  // ✅ Direct import
import { Composer } from '@core/models/composer';

@Component({
  selector: 'app-composer-list',
  templateUrl: './composer-list.component.html'
})
export class ComposerListComponent implements OnInit {
  composers: Composer[] = [];

  constructor(private composerService: ComposerService) {}  // ✅ Direct injection

  ngOnInit() {
    this.loadComposers();
  }

  loadComposers() {
    this.composerService.getComposers().subscribe({  // ✅ Direct call
      next: (composers) => {
        this.composers = composers;
      },
      error: (err) => console.error(err)
    });
  }

  deleteComposer(id: number) {
    this.composerService.deleteComposer(id).subscribe({  // ✅ Direct call
      next: () => {
        this.loadComposers();
      }
    });
  }

  enrichComposer(id: number) {
    this.composerService.enrichComposer(id).subscribe({  // ✅ Direct call
      next: (composer) => {
        // Update composer in list
        const index = this.composers.findIndex(c => c.id === id);
        if (index !== -1) {
          this.composers[index] = composer;
        }
      }
    });
  }
}
```

**Changes:**
- ✅ Import: `ApiService` → `ComposerService`
- ✅ Constructor: `api: ApiService` → `composerService: ComposerService`
- ✅ Calls: `this.api.getComposers()` → `this.composerService.getComposers()`
- ✅ Same for `deleteComposer` and `enrichComposer`

**Lines changed:** 4  
**Time:** ~5 minutes  
**Risk:** Very low (same API, different service)

## Multi-Domain Example: Literature List

Some components use multiple domains. Inject multiple services:

```typescript
// literature-list.component.ts
import { Component } from '@angular/core';
import { PieceService } from '@core/services/piece.service';
import { ComposerService } from '@core/services/composer.service';
import { CategoryService } from '@core/services/category.service';
import { CollectionService } from '@core/services/collection.service';

@Component({
  selector: 'app-literature-list',
  templateUrl: './literature-list.component.html'
})
export class LiteratureListComponent {
  constructor(
    private pieceService: PieceService,
    private composerService: ComposerService,
    private categoryService: CategoryService,
    private collectionService: CollectionService
  ) {}

  loadData() {
    // Now it's clear this component needs 4 services
    this.pieceService.getMyRepertoire(...).subscribe(...);
    this.composerService.getComposers().subscribe(...);
    this.categoryService.getCategories().subscribe(...);
    this.collectionService.getCollections().subscribe(...);
  }
}
```

**Benefit:** Crystal-clear dependencies!

## Testing Migration

### Before (mocking ApiService)

```typescript
describe('ComposerListComponent', () => {
  let component: ComposerListComponent;
  let apiSpy: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    apiSpy = jasmine.createSpyObj('ApiService', [
      'getComposers',
      'deleteComposer',
      'enrichComposer',
      // Need to list all 100+ methods even if not used
    ]);

    TestBed.configureTestingModule({
      providers: [{ provide: ApiService, useValue: apiSpy }]
    });
  });

  it('should load composers', () => {
    apiSpy.getComposers.and.returnValue(of([...]));
    // test
  });
});
```

### After (mocking ComposerService)

```typescript
describe('ComposerListComponent', () => {
  let component: ComposerListComponent;
  let composerSpy: jasmine.SpyObj<ComposerService>;

  beforeEach(() => {
    composerSpy = jasmine.createSpyObj('ComposerService', [
      'getComposers',
      'deleteComposer',
      'enrichComposer'
      // Only methods actually used
    ]);

    TestBed.configureTestingModule({
      providers: [{ provide: ComposerService, useValue: composerSpy }]
    });
  });

  it('should load composers', () => {
    composerSpy.getComposers.and.returnValue(of([...]));
    // test
  });
});
```

**Benefits:**
- ✅ Smaller mock (3 methods vs 100+)
- ✅ Clearer test intent
- ✅ Faster test execution

## Migration Strategy

### For New Features
**MUST use domain services directly.** Do not use `ApiService`.

### For Existing Code

**Option 1: Opportunistic Migration (Recommended)**
- Migrate when you touch a component for other reasons
- Low risk, spreads effort over time
- Track progress in component comments

**Option 2: Batch Migration by Feature**
- Pick one feature module (e.g., `composers`, `authors`)
- Migrate all components in that module
- Test thoroughly
- Move to next module

**Option 3: Leave As-Is**
- If a component is stable and rarely changes
- Keep using `ApiService` (it still works)
- No urgent need to migrate

### Migration Tracking

Add a comment when migrating:

```typescript
// Migrated from ApiService to ComposerService - 2026-02-24
constructor(private composerService: ComposerService) {}
```

## Common Pitfalls

### Pitfall 1: Importing Wrong Service

```typescript
// ❌ Wrong: Still using ApiService
import { ApiService } from '@core/services/api.service';

// ✅ Correct: Direct domain service
import { ComposerService } from '@core/services/composer.service';
```

### Pitfall 2: Forgetting to Update All Calls

```typescript
// ❌ Mixed usage
constructor(
  private api: ApiService,
  private composerService: ComposerService
) {}

loadComposers() {
  this.api.getComposers().subscribe(...);  // Still using api!
}
```

**Solution:** Search-and-replace `this.api.` → `this.composerService.` (or relevant service)

### Pitfall 3: Not Updating Tests

Components will work, but tests will fail if you don't update mocks.

## Verification Checklist

After migrating a component:

- [ ] No more `ApiService` import
- [ ] No more `api: ApiService` in constructor
- [ ] No more `this.api.` calls in code
- [ ] Domain services imported and injected
- [ ] All method calls updated to use domain services
- [ ] Tests updated to mock domain services
- [ ] Tests pass (`ng test`)
- [ ] Component still works in app (`ng serve`)
- [ ] Migration comment added (optional)

## Progress Tracking

Track migration progress:

```bash
# Count components still using ApiService
grep -r "private.*api.*ApiService" src/app/features --include="*.ts" | wc -l

# Count components using domain services
grep -r "private.*composerService\|pieceService\|collectionService" src/app/features --include="*.ts" | wc -l
```

**Initial (2026-02-24):** ~50 components using `ApiService`  
**Target:** 0 components using `ApiService` (completion tbd)

## Domain Service Reference

All domain services extend `CreatorService<T>` or provide specialized methods:

| Service | Extends | Key Methods |
|---------|---------|-------------|
| `PieceService` | `CreatorService<Piece>` | `getMyRepertoire()`, `updatePieceStatus()`, `enrichPiece()` |
| `ComposerService` | `CreatorService<Composer>` | `getComposers()`, `enrichComposer()` |
| `AuthorService` | `CreatorService<Author>` | `getAuthors()`, `enrichAuthor()` |
| `PublisherService` | `CreatorService<Publisher>` | `getPublishers()` |
| `CategoryService` | `CreatorService<Category>` | `getCategories()` |
| `CollectionService` | - | `getCollections()`, `uploadCollectionCover()` |
| `EventService` | - | `getEvents()`, `createEvent()` |
| `MonthlyPlanService` | - | `getMonthlyPlan()`, `finalizeMonthlyPlan()` |
| `PlanEntryService` | - | `createPlanEntry()`, `updatePlanEntry()` |
| `ChoirService` | - | `getChoirs()`, `createChoir()` |
| `UserService` | - | `getCurrentUser()`, `updateCurrentUser()` |
| `AuthService` | - | `login()`, `logout()`, `register()` |
| `SearchService` | - | `searchAll()` |
| `LibraryService` | - | `getLibraryItems()`, `addLibraryItem()` |
| `PostService` | - | `getPosts()`, `createPost()` |
| `ProgramService` | - | `getPrograms()`, `createProgram()` |

**See:** [`services/creator.service.ts`](../../choir-app-frontend/src/app/core/services/creator.service.ts) for base CRUD pattern.

## Questions & Support

**Q: Can I still use ApiService for now?**  
A: Yes, it's deprecated but not removed. It still works and will continue to work for existing code.

**Q: Do I have to migrate all components at once?**  
A: No! Migrate opportunistically or by feature module. New features MUST use domain services.

**Q: What if I need multiple domain services?**  
A: Just inject all of them in the constructor. It actually makes dependencies clearer!

**Q: Will this break my tests?**  
A: Only if you don't update the mocks. Update the test setup to mock the domain service instead of ApiService.

**Q: How do I find which service to use?**  
A: Check the deprecation comment in `api.service.ts` or use the table in Step 1 above.

**Q: What about new methods added to ApiService?**  
A: Don't add new methods to ApiService! Add them to the appropriate domain service instead.

## Related Documentation

- [API Refactoring Complete](API-REFACTORING-COMPLETE.md) - Overview of service architecture
- [Creator Service Pattern](../../choir-app-frontend/src/app/core/services/creator.service.ts) - Base CRUD service
- [Architecture Overview](../project/ARCHITECTURE.md) - System design

---

**Last Updated:** 2026-02-24  
**Status:** Active Migration  
**Maintainer:** Development Team  
**Migration Progress:** 0/50 components (0%)
