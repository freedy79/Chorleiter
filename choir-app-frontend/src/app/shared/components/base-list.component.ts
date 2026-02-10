import { Component, ViewChild, OnInit, AfterViewInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { Observable } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { BaseComponent } from './base.component';
import { PaginatorService } from '@core/services/paginator.service';

/**
 * Base Component for List/Table Views with Automatic Setup
 *
 * This abstract base class eliminates boilerplate code across list components by providing:
 * - Automatic MatTableDataSource setup
 * - Automatic MatSort and MatPaginator wiring
 * - Automatic page size persistence
 * - Loading state management
 * - Subscription cleanup (via BaseComponent)
 * - Customizable filter predicates
 * - Data loading lifecycle hooks
 *
 * Usage:
 * ```typescript
 * export class MyListComponent extends BaseListComponent<MyType> {
 *   constructor(paginatorService: PaginatorService, private myApi: ApiService) {
 *     super(paginatorService);
 *   }
 *
 *   get paginatorKey(): string {
 *     return 'my-list';
 *   }
 *
 *   loadData(): Observable<MyType[]> {
 *     return this.myApi.getItems();
 *   }
 *
 *   // Optional: custom filter predicate
 *   customFilterPredicate(data: MyType, filter: string): boolean {
 *     return data.name.toLowerCase().includes(filter);
 *   }
 * }
 * ```
 *
 * Features:
 * - Automatically loads data on init
 * - Automatically wires up sort and paginator in AfterViewInit
 * - Persists page size per-list using paginatorKey
 * - Manages isLoading state during data fetches
 * - Provides refresh() method for manual reloading
 * - Supports custom filter predicates
 * - Compatible with both client-side and server-side approaches
 *
 * @template T The type of data displayed in the table
 */
@Component({
  template: ''
})
export abstract class BaseListComponent<T> extends BaseComponent implements OnInit, AfterViewInit {
  /**
   * The MatTableDataSource that holds and manages table data.
   * Override initDataSource() if you need custom initialization.
   */
  dataSource!: MatTableDataSource<T>;

  /**
   * Loading state indicator. Set to true while data is being fetched.
   * Automatically managed by the base class.
   */
  isLoading = false;

  /**
   * Current page size for the paginator.
   * Automatically loaded from user preferences via PaginatorService.
   */
  pageSize = 10;

  /**
   * Available page size options for the paginator.
   * Can be overridden in child classes.
   */
  pageSizeOptions: number[] = [10, 25, 50];

  /**
   * Optional MatSort for table sorting.
   * Automatically wired to dataSource in ngAfterViewInit if present.
   */
  @ViewChild(MatSort) sort?: MatSort;

  /**
   * Optional MatPaginator for table pagination.
   * Automatically wired to dataSource in ngAfterViewInit if present.
   * Page size changes are automatically persisted.
   */
  @ViewChild(MatPaginator) paginator?: MatPaginator;

  /**
   * @param paginatorService Service for persisting page sizes
   */
  constructor(protected paginatorService: PaginatorService) {
    super();
  }

  /**
   * Unique key for persisting paginator state.
   * Should be unique per list component (e.g., 'event-list', 'user-list').
   * Used by PaginatorService to save/restore page size preferences.
   */
  abstract get paginatorKey(): string;

  /**
   * Load data for the table.
   * Must return an Observable that emits the array of items to display.
   *
   * For simple client-side lists:
   * ```typescript
   * loadData(): Observable<User[]> {
   *   return this.apiService.getUsers();
   * }
   * ```
   *
   * For server-side pagination, you'll need to override the default behavior
   * and handle pagination yourself. See literature-list.component.ts for an example.
   */
  abstract loadData(): Observable<T[]>;

  /**
   * Optional: Define a custom filter predicate for the dataSource.
   * Called when the user applies filters to the table.
   *
   * Example:
   * ```typescript
   * customFilterPredicate(data: User, filter: string): boolean {
   *   const term = filter.toLowerCase();
   *   return data.name.toLowerCase().includes(term) ||
   *          data.email.toLowerCase().includes(term);
   * }
   * ```
   *
   * @param data The data object to filter
   * @param filter The filter string (already trimmed and lowercased by default)
   * @returns true if the item should be displayed, false otherwise
   */
  protected customFilterPredicate?(data: T, filter: string): boolean;

  /**
   * Optional: Hook called after data is successfully loaded.
   * Use this for post-processing, analytics, or side effects.
   *
   * Example:
   * ```typescript
   * onDataLoaded(data: User[]): void {
   *   console.log(`Loaded ${data.length} users`);
   *   this.updateTotalCount(data.length);
   * }
   * ```
   *
   * @param data The loaded data array
   */
  protected onDataLoaded?(data: T[]): void;

  /**
   * Optional: Initialize the dataSource with custom configuration.
   * Override this if you need special dataSource setup.
   *
   * Example:
   * ```typescript
   * initDataSource(): void {
   *   super.initDataSource(); // Call parent first
   *   this.dataSource.sortingDataAccessor = (item, property) => {
   *     // Custom sorting logic
   *   };
   * }
   * ```
   */
  protected initDataSource(): void {
    this.dataSource = new MatTableDataSource<T>();

    // Apply custom filter predicate if provided
    if (this.customFilterPredicate) {
      this.dataSource.filterPredicate = this.customFilterPredicate;
    }
  }

  /**
   * Lifecycle: Initialize component.
   * Loads persisted page size and triggers initial data load.
   */
  ngOnInit(): void {
    // Load persisted page size
    this.pageSize = this.paginatorService.getPageSize(
      this.paginatorKey,
      this.pageSizeOptions[0]
    );

    // Initialize data source
    this.initDataSource();

    // Load initial data
    this.refresh();
  }

  /**
   * Lifecycle: After view initialization.
   * Wires up sort and paginator to the dataSource.
   */
  ngAfterViewInit(): void {
    this.setupSort();
    this.setupPaginator();
  }

  /**
   * Reload data from the source.
   * Sets loading state, calls loadData(), and updates the dataSource.
   *
   * Call this method to manually refresh the list:
   * ```typescript
   * this.refresh();
   * ```
   */
  refresh(): void {
    this.isLoading = true;

    this.loadData()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.dataSource.data = data;
          this.isLoading = false;

          // Call optional hook
          if (this.onDataLoaded) {
            this.onDataLoaded(data);
          }
        },
        error: (error) => {
          console.error(`Error loading data for ${this.paginatorKey}:`, error);
          this.isLoading = false;
          // Child classes can override to handle errors differently
          this.handleLoadError(error);
        }
      });
  }

  /**
   * Handle errors during data loading.
   * Override this method to provide custom error handling.
   *
   * @param error The error object from the failed Observable
   */
  protected handleLoadError(error: any): void {
    // Default: just log the error
    // Child classes can override to show snackbars, etc.
  }

  /**
   * Configure MatSort if present in the template.
   * Automatically wires sort to dataSource.
   */
  private setupSort(): void {
    if (this.sort) {
      this.dataSource.sort = this.sort;
    }
  }

  /**
   * Configure MatPaginator if present in the template.
   * Automatically wires paginator to dataSource and persists page size changes.
   */
  private setupPaginator(): void {
    if (this.paginator) {
      this.paginator.pageSize = this.pageSize;
      this.dataSource.paginator = this.paginator;

      // Persist page size changes
      this.paginator.page
        .pipe(takeUntil(this.destroy$))
        .subscribe((event) => {
          this.paginatorService.setPageSize(this.paginatorKey, event.pageSize);
        });
    }
  }

  /**
   * Apply a filter to the dataSource.
   * Useful for search functionality.
   *
   * Example:
   * ```typescript
   * onSearch(term: string): void {
   *   this.applyFilter(term);
   * }
   * ```
   *
   * @param filterValue The filter string to apply
   */
  protected applyFilter(filterValue: string): void {
    this.dataSource.filter = filterValue.trim().toLowerCase();

    // Reset to first page when filtering
    if (this.paginator) {
      this.paginator.firstPage();
    }
  }
}
