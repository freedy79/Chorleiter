# BaseListComponent Migration Guide

## Overview

The `BaseListComponent<T>` is an abstract base class that eliminates boilerplate code across list/table components by providing:

- Automatic `MatTableDataSource` setup
- Automatic `MatSort` and `MatPaginator` wiring
- Automatic page size persistence via `PaginatorService`
- Loading state management
- Subscription cleanup (via `BaseComponent`)
- Customizable filter predicates
- Data loading lifecycle hooks

## When to Use BaseListComponent

✅ **Use BaseListComponent for:**
- Simple client-side lists that load all data at once
- Tables with standard sorting and pagination
- Components that need automatic page size persistence
- Lists with custom filter predicates
- Components that would benefit from reduced boilerplate

❌ **Don't use BaseListComponent for:**
- Server-side paginated lists (where the server handles pagination)
- Lists with complex reactive filter pipelines
- Components with custom data streaming requirements
- Tables that don't use `MatTableDataSource`

## Migration Steps

### 1. Update Component Class Declaration

**Before:**
```typescript
export class MyListComponent implements OnInit, AfterViewInit {
  dataSource = new MatTableDataSource<MyType>();
  isLoading = false;
  pageSize = 10;
  pageSizeOptions = [10, 25, 50];
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private api: ApiService,
    private paginatorService: PaginatorService
  ) {
    this.pageSize = this.paginatorService.getPageSize('my-list', 10);
  }
}
```

**After:**
```typescript
export class MyListComponent extends BaseListComponent<MyType> {
  // dataSource, isLoading, pageSize, sort, paginator are inherited

  constructor(
    paginatorService: PaginatorService,  // Must be first!
    private api: ApiService
  ) {
    super(paginatorService);
  }

  get paginatorKey(): string {
    return 'my-list';  // Unique key for this list
  }
}
```

### 2. Implement loadData() Method

**Before:**
```typescript
loadData(): void {
  this.isLoading = true;
  this.api.getItems().subscribe(data => {
    this.dataSource.data = data;
    this.isLoading = false;
  });
}
```

**After:**
```typescript
loadData(): Observable<MyType[]> {
  return this.api.getItems();
}
```

The base class handles:
- Setting `isLoading = true` before loading
- Setting `isLoading = false` after loading
- Assigning data to `dataSource.data`
- Error handling
- Subscription cleanup

### 3. Update Method Calls

Replace all calls to your old `loadData()` method with `this.refresh()`.

**Before:**
```typescript
deleteItem(item: MyType): void {
  this.api.deleteItem(item.id).subscribe(() => this.loadData());
}
```

**After:**
```typescript
deleteItem(item: MyType): void {
  this.api.deleteItem(item.id).subscribe(() => this.refresh());
}
```

### 4. Remove Boilerplate from ngOnInit and ngAfterViewInit

**Before:**
```typescript
ngOnInit(): void {
  this.loadData();
  // ... other initialization
}

ngAfterViewInit(): void {
  this.dataSource.sort = this.sort;
  this.dataSource.paginator = this.paginator;
  this.paginator.pageSize = this.pageSize;
  this.paginator.page.subscribe(e => {
    this.paginatorService.setPageSize('my-list', e.pageSize);
  });
}
```

**After:**
```typescript
ngOnInit(): void {
  // Call parent first to trigger data loading
  super.ngOnInit();
  // ... other initialization
}

ngAfterViewInit(): void {
  // Call parent to wire up sort/paginator
  super.ngAfterViewInit();
  // ... other AfterViewInit logic (if any)
}
```

### 5. Add Custom Filter Predicate (Optional)

**Before:**
```typescript
ngOnInit(): void {
  this.dataSource.filterPredicate = (data, filter) => {
    return data.name.toLowerCase().includes(filter);
  };
}
```

**After:**
```typescript
protected customFilterPredicate(data: MyType, filter: string): boolean {
  return data.name.toLowerCase().includes(filter);
}
```

### 6. Add Post-Load Hook (Optional)

If you need to perform actions after data is loaded:

```typescript
protected onDataLoaded(data: MyType[]): void {
  console.log(`Loaded ${data.length} items`);
  // Update UI, trigger analytics, etc.
}
```

### 7. Customize DataSource Initialization (Optional)

If you need custom sorting or other dataSource configuration:

```typescript
protected initDataSource(): void {
  super.initDataSource();  // Important: call parent first

  this.dataSource.sortingDataAccessor = (item, property) => {
    switch (property) {
      case 'title':
        return item.title.toLowerCase();
      default:
        return (item as any)[property];
    }
  };
}
```

### 8. Handle Filters

**Before:**
```typescript
applyFilter(value: string): void {
  this.dataSource.filter = value.trim().toLowerCase();
  if (this.paginator) {
    this.paginator.firstPage();
  }
}
```

**After:**
```typescript
// Just call the inherited method
onSearch(value: string): void {
  this.applyFilter(value);  // Inherited from base class
}
```

## Complete Migration Example

### Before: manage-users.component.ts

```typescript
export class ManageUsersComponent implements OnInit {
  users: User[] = [];
  dataSource = new MatTableDataSource<User>();
  isLoading = false;

  constructor(
    private api: ApiService,
    private paginatorService: PaginatorService
  ) {}

  ngOnInit(): void {
    this.dataSource.filterPredicate = (data, filter) => {
      const term = filter.trim().toLowerCase();
      return data.name?.toLowerCase().includes(term) ||
             data.email.toLowerCase().includes(term);
    };
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading = true;
    this.api.getUsers().subscribe(data => {
      this.users = data;
      this.dataSource.data = data;
      this.isLoading = false;
    });
  }

  deleteUser(user: User): void {
    if (confirm('Delete user?')) {
      this.api.deleteUser(user.id).subscribe(() => this.loadUsers());
    }
  }
}
```

### After: manage-users.component.ts

```typescript
export class ManageUsersComponent extends BaseListComponent<User> {
  constructor(
    paginatorService: PaginatorService,
    private api: ApiService
  ) {
    super(paginatorService);
  }

  get paginatorKey(): string {
    return 'manage-users';
  }

  loadData(): Observable<User[]> {
    return this.api.getUsers();
  }

  protected customFilterPredicate(data: User, filter: string): boolean {
    const term = filter.trim().toLowerCase();
    return data.name?.toLowerCase().includes(term) ||
           data.email.toLowerCase().includes(term);
  }

  deleteUser(user: User): void {
    if (confirm('Delete user?')) {
      this.api.deleteUser(user.id).subscribe(() => this.refresh());
    }
  }
}
```

**Lines of code removed:** ~25
**Boilerplate eliminated:** MatTableDataSource setup, loading state, pagination wiring, subscription management

## Advanced Patterns

### Pattern 1: Component with Navigation State

When using `NavigationStateService` to restore scroll position:

```typescript
export class CollectionListComponent extends BaseListComponent<Collection>
  implements OnInit, AfterViewInit {

  private initialState: ListViewState | null = null;

  constructor(
    paginatorService: PaginatorService,
    private navState: NavigationStateService
  ) {
    super(paginatorService);
    this.navState.onPopState('collection-list', s => this.initialState = s);
  }

  ngOnInit(): void {
    this.initialState = this.navState.getState('collection-list');
    super.ngOnInit();  // Call parent AFTER local init
  }

  ngAfterViewInit(): void {
    super.ngAfterViewInit();  // Call parent first

    // Restore page from state
    if (this.paginator && this.initialState) {
      this.paginator.pageIndex = this.initialState.page;
    }
  }
}
```

### Pattern 2: Component with Custom Sorting

For tables with custom sorting logic:

```typescript
export class LibraryComponent extends BaseListComponent<LibraryItem> {
  protected initDataSource(): void {
    super.initDataSource();

    this.dataSource.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'title':
          return item.collection?.title.toLowerCase() || '';
        default:
          return (item as any)[property];
      }
    };
  }
}
```

### Pattern 3: Component with Post-Load Processing

For components that need to load additional data after the main list loads:

```typescript
export class CollectionListComponent extends BaseListComponent<Collection> {
  protected onDataLoaded(collections: Collection[]): void {
    // Load cover images for collections
    const coverRequests = collections
      .filter(c => c.coverImage)
      .map(c => this.api.getCollectionCover(c.id)
        .pipe(map(data => ({ id: c.id, data }))));

    if (coverRequests.length) {
      forkJoin(coverRequests).subscribe(results => {
        results.forEach(res => {
          const col = collections.find(c => c.id === res.id);
          if (col) col.coverImageData = res.data;
        });
        this.dataSource.data = [...collections];  // Trigger change detection
      });
    }
  }
}
```

## Components Already Migrated

✅ **Completed:**
1. `manage-users.component.ts` - Simple admin table with custom filter
2. `manage-choirs.component.ts` - Simple admin table
3. `collection-list.component.ts` - List with navigation state and cover image loading
4. `library.component.ts` - List with expanded state via service and custom sorting

## Components Ready to Migrate

🔄 **Ready for migration:**
1. `manage-congregations.component.ts` - Simple CRUD table
2. `manage-districts.component.ts` - Simple CRUD table
3. `manage-publishers.component.ts` - Admin table (needs verification)
4. `manage-creators.component.ts` - Admin table (needs verification)
5. `mail-logs.component.ts` - Read-only admin table (needs verification)
6. `login-attempts.component.ts` - Read-only admin table (needs verification)
7. `manage-piece-changes.component.ts` - Admin table (needs verification)
8. `choir-members.component.ts` - Member list (needs verification)
9. `collection-piece-list.component.ts` - Piece list within collection (needs verification)

## Components NOT Suitable for BaseListComponent

❌ **Should NOT migrate:**
1. `literature-list.component.ts` - Uses server-side pagination with page caching and prefetching
2. `event-list.component.ts` - Uses custom `ListDataSource` instead of `MatTableDataSource`

**Reason:** These components have specialized data loading patterns that don't fit the client-side loading model of BaseListComponent.

**Alternative:** These components should continue to extend `BaseComponent` directly for subscription management, but handle their own data loading, pagination, and state management.

## Benefits Summary

### Code Reduction
- **Average reduction:** 25-40 lines per component
- **Boilerplate eliminated:**
  - MatTableDataSource initialization
  - MatSort/MatPaginator ViewChild declarations
  - ngAfterViewInit wiring code
  - Page size persistence logic
  - Loading state management
  - Subscription cleanup with takeUntil

### Consistency
- All list components follow the same pattern
- Easier to understand and maintain
- Consistent page size persistence across the app
- Standardized loading states

### Developer Experience
- Less code to write for new list components
- Clear extension points (loadData, customFilterPredicate, etc.)
- Type-safe with generics
- Comprehensive documentation

## Troubleshooting

### Issue: "Cannot find name 'paginatorService'"
Make sure `paginatorService` is the **first** parameter in your constructor:
```typescript
constructor(
  paginatorService: PaginatorService,  // Must be first!
  private api: ApiService
) {
  super(paginatorService);
}
```

### Issue: "Data not loading on init"
Make sure you call `super.ngOnInit()` if you override `ngOnInit`:
```typescript
ngOnInit(): void {
  // Your init code
  super.ngOnInit();  // This triggers data loading
}
```

### Issue: "Sort/Paginator not working"
Make sure you call `super.ngAfterViewInit()` if you override `ngAfterViewInit`:
```typescript
ngAfterViewInit(): void {
  super.ngAfterViewInit();  // This wires up sort/paginator
  // Your AfterViewInit code
}
```

### Issue: "Custom filter not working"
Make sure the method signature matches exactly:
```typescript
protected customFilterPredicate(data: MyType, filter: string): boolean {
  // 'protected' keyword is required
  // Return type must be boolean
  // Parameters must be (data: T, filter: string)
}
```

## Next Steps

1. Review the list of components ready to migrate
2. Migrate 2-3 components at a time
3. Test thoroughly after each migration
4. Update this document with any new patterns discovered
5. Consider creating additional specialized base classes for other common patterns (e.g., `BaseServerPaginatedListComponent`)

## Questions?

Contact the development team or refer to:
- `base-list.component.ts` - Source code with inline documentation
- Example components listed above
- Angular Material documentation for MatTableDataSource
