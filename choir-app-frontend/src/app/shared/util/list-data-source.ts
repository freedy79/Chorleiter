import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { PaginatorService } from '@core/services/paginator.service';

export class ListDataSource<T> extends MatTableDataSource<T> {
  constructor(private paginatorService: PaginatorService, private key: string, data: T[] = []) {
    super(data);
  }

  connectPaginator(paginator: MatPaginator, pageSizeOptions: number[]): number {
    const defaultSize = pageSizeOptions[0];
    const size = this.paginatorService.getPageSize(this.key, defaultSize);
    paginator.pageSize = size;
    paginator.page.subscribe(e => this.paginatorService.setPageSize(this.key, e.pageSize));
    this.paginator = paginator;
    return size;
  }
}
