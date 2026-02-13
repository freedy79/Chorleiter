# Phase 3: Major Refactors Plan

## Overview
Phase 3 focuses on consolidating larger architectural patterns that appear in multiple components. These require more careful planning as they involve inheritance/composition patterns and shared state management.

## Task 1: BaseListComponent Consolidation

### Current State
Multiple components repeat pagination/sort/filter boilerplate with MatTable:
1. `collection-list.component.ts`
2. `piece-list.component.ts` (literature)
3. `manage-publishers.component.ts`
4. `manage-creators.component.ts`
5. `manage-users.component.ts`

### Pattern Analysis

All five components share:
- MatTable with MatPaginator and MatSort
- DataSource initialization: `new MatTableDataSource<T>()`
- Paginator setup: `@ViewChild(MatPaginator)` with setter pattern
- Sort setup: `@ViewChild(MatSort)` with setter pattern
- displayedColumns definition
- Search/filter functionality with dataSource filtering

### Solution: Enhanced BaseListComponent

**File**: `shared/components/base-list.component.ts` (already exists, needs enhancement)

**Current Implementation** (needs to be extended):
```typescript
export class BaseListComponent<T> extends BaseComponent implements OnDestroy {
  protected paginatorService: PaginatorService;
  protected dataSource = new MatTableDataSource<T>();
  abstract get paginatorKey(): string;
}
```

**Enhanced Implementation Plan**:

1. **ViewChild Setters** (prevent ExpressionChangedAfterItHasBeenChecked)
```typescript
@ViewChild(MatSort) set sort(sort: MatSort) {
  if (sort && !this.dataSource.sort) {
    this.dataSource.sort = sort;
  }
}

@ViewChild(MatPaginator) set paginator(paginator: MatPaginator) {
  if (paginator && !this.dataSource.paginator) {
    this.dataSource.paginator = paginator;
    this.updatePageSize(paginator);
  }
}
```

2. **Core Methods**
```typescript
protected abstract get paginatorKey(): string;

protected loadData(items: T[]): void {
  this.dataSource.data = items;
}

protected updatePageSize(paginator: MatPaginator): void {
  const sizes = this.pageSizeOptions || [10, 25, 50];
  const stored = this.paginatorService.getPageSize(this.paginatorKey, sizes[0]);
  paginator.pageSize = stored;
}

applyFilter(filterValue: string): void {
  this.dataSource.filter = filterValue.trim().toLowerCase();
  if (this.dataSource.paginator) {
    this.dataSource.paginator.firstPage();
  }
}

resetFilter(): void {
  this.applyFilter('');
}

get filteredData(): T[] {
  return this.dataSource.filteredData;
}
```

3. **Properties to Add**
```typescript
displayedColumns: string[] = [];
pageSizeOptions: number[] = [10, 25, 50];
currentFilter = '';
totalItems = 0;

get itemCount(): number {
  return this.dataSource.data.length;
}
```

### Components to Update

#### 1. collection-list.component.ts (141 lines)
**Current Duplicates**:
- Manual dataSource.data assignment
- Filter through dataSource.data
- Paginator.pageSize set manually

**Refactor Changes**:
- Remove paginator/sort setup code (done by base class)
- Use `loadData(items)` instead of `dataSource.data = items`
- Use base `applyFilter()` method

**Lines Saved**: ~20

#### 2. piece-list.component.ts (61 lines)
**Current Duplicates**:
- Same paginator/sort setup pattern
- Manual data loading
- Manual page size handling

**Refactor Changes**:
- Inherit improved BaseListComponent
- Use setters from base

**Lines Saved**: ~15

#### 3. manage-publishers.component.ts
**Current Duplicates**:
- Identical paginator/sort pattern
- Filter implementation

**Refactor Changes**:
- Use base class methods

**Lines Saved**: ~15

#### 4. manage-creators.component.ts
**Current Duplicates**:
- Same as publishers

**Refactor Changes**:
- Use base class

**Lines Saved**: ~15

#### 5. manage-users.component.ts
**Current Duplicates**:
- Full table setup boilerplate

**Refactor Changes**:
- Use base class

**Lines Saved**: ~20

**Total Lines Saved**: 85+

---

## Task 2: Cache Service Consolidation

### Current State
Found 4 separate cache implementations:

1. **Local variable caching** (composerCache in collection-list)
```typescript
public composerCache = new Map<number, string>();
```

2. **Service-level caching** (some services cache results)
```typescript
// In various services
private cache: Map<string, any> = new Map();
```

3. **NodeCache usage** (backend monthly plans)
```typescript
// choir-app-backend - uses NodeCache with TTL
const cache = new NodeCache({ stdTTL: 60 });
```

4. **Memory-based caching** (image cache service)
```typescript
// ImageCacheService - manages image blob cache
private cache = new Map<string, Blob>();
```

### Solution: Unified CacheService

**File**: `core/services/cache.service.ts`

**Generic Cache Service**:
```typescript
@Injectable({
  providedIn: 'root'
})
export class CacheService {
  // Key-based cache with TTL support
  private caches = new Map<string, CacheEntry<any>>();

  get<T>(key: string): T | null
  set<T>(key: string, value: T, ttlSeconds?: number): void
  has(key: string): boolean
  remove(key: string): void
  clear(): void
  
  getOrFetch<T>(
    key: string,
    fetchFn: () => Observable<T>,
    ttlSeconds?: number
  ): Observable<T>
}
```

**Features**:
- Generic type support
- Optional TTL with automatic expiration
- `getOrFetch` for lazy-loading patterns
- Automatic cleanup on expiration

### Components to Update

1. **collection-list.component.ts**: Replace `composerCache: Map<number, string>()` with `cache.get('composer_${id}')`
2. **Various services**: Use CacheService instead of local Maps
3. **ImageCacheService**: Potentially extend CacheService

**Lines Saved**: 50+

---

## Task 3: Navigation Utilities

### Current State
Multiple patterns for navigation:

1. **Basic router.navigate()**
```typescript
this.router.navigate(['/pieces', id], { 
  queryParams: { ... } 
});
```

2. **With state preservation**
```typescript
this.router.navigate(['/pieces', id], {
  state: { fromList: true, scrollPosition: this.scrollY }
});
```

3. **Relative navigation**
```typescript
this.router.navigate(['detail', id], { relativeTo: this.route });
```

4. **With queryParams**
```typescript
this.router.navigate([], { 
  relativeTo: this.route,
  queryParams: { tab: 0 },
  queryParamsHandling: 'merge'
});
```

### Solution: Navigation Facade Service

**File**: `core/services/navigation-facade.service.ts`

**Methods**:
```typescript
// Entity navigation
navigateToDetail(type: 'piece' | 'collection' | ..., id: number, state?: any)
navigateToList(type: string)
navigateToEdit(type: string, id: number)

// Relative navigation
navigateRelative(path: string | string[], options?: NavigationExtras)

// Query params
updateQueryParams(params: Params, merge = true)
clearQueryParams()

// State management
saveNavigationState(key: string, state: any)
getNavigationState(key: string): any
clearNavigationState(key: string)
```

### Patterns to Consolidate

1. **Edit navigation**: `navigateToEdit('piece', id)`
2. **List navigation**: `navigateToList('pieces')`
3. **Detail navigation**: `navigateToDetail('piece', id)`
4. **Tab switching**: `updateQueryParams({ tab: 1 }, true)`
5. **Return to list**: Combined with NavigationStateService

**Lines Saved**: 80+

---

## Implementation Sequence

### Week 1: BaseListComponent
1. Enhance BaseListComponent with setters and core methods
2. Refactor collection-list.component.ts
3. Refactor piece-list.component.ts 
4. Refactor manage-publishers.component.ts
5. Refactor manage-creators.component.ts
6. Refactor manage-users.component.ts

### Week 2: Cache & Navigation
1. Create CacheService 
2. Update components using Map-based caching
3. Create NavigationFacadeService
4. Update router.navigate() calls across components

### Testing
- Unit tests for BaseListComponent functionality
- CacheService TTL behavior
- Navigation routing and state preservation

## Estimated Impact

### Complexity
- **BaseListComponent**: Medium (affects 5 components, but clear pattern)
- **CacheService**: Low (pure utility, no breaking changes)
- **NavigationFacadeService**: Medium (many call sites, must preserve behavior)

### Code Reduction
- BaseListComponent: 85+ lines
- CacheService + usage: 50+ lines
- Navigation utilities: 80+ lines
- **Total**: 215+ lines

### Cumulative Impact (Phase 1 + 2 + 3)
- **Total reduced lines**: 565+ lines of duplicate code
- **Reusable patterns created**: 8 (utilities, services, components)
- **Consolidated duplicates**: 50+ instances

## Risk Assessment

### BaseListComponent
**Risk**: Medium - Existing inheritance chain may need adjustment
**Mitigation**: Test paginator/sort behavior thoroughly

### CacheService
**Risk**: Low - New service, no breaking changes required
**Mitigation**: Gradual migration of existing caches

### NavigationFacadeService
**Risk**: Medium - Many call sites to update
**Mitigation**: Keep router reference available as escape hatch

## Success Criteria

- [ ] BaseListComponent used by all 5 target components
- [ ] CacheService covers existing cache patterns
- [ ] Navigation utilities cover 80%+ of router.navigate() calls
- [ ] No compilation errors
- [ ] All tests pass
- [ ] Type safety maintained (no `any` types)
