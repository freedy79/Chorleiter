import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { PaginatorService } from '@core/services/paginator.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

export class ListDataSource<T> extends MatTableDataSource<T> {
  private destroy$ = new Subject<void>();

  constructor(private paginatorService: PaginatorService, private key: string, data: T[] = []) {
    super(data);
  }

  connectPaginator(paginator: MatPaginator, pageSizeOptions: number[]): number {
    const defaultSize = pageSizeOptions[0];
    const size = this.paginatorService.getPageSize(this.key, defaultSize);
    paginator.pageSize = size;
    paginator.page.pipe(
      takeUntil(this.destroy$)
    ).subscribe(e => {
      this.paginatorService.setPageSize(this.key, e.pageSize);
      // Trigger filtering to update the view when page size changes
      this._updateChangeSubscription();
    });
    this.paginator = paginator;
    return size;
  }

  destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
