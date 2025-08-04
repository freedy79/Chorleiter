import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { ApiService } from '@core/services/api.service';
import { Collection } from '@core/models/collection';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { PaginatorService } from '@core/services/paginator.service';

@Component({
  selector: 'app-collection-list',
  standalone: true,
  imports: [
    CommonModule,
    MaterialModule,
    RouterLink
  ],
  templateUrl: './collection-list.component.html',
  styleUrls: ['./collection-list.component.scss']
})
export class CollectionListComponent implements OnInit, AfterViewInit {
  public dataSource = new MatTableDataSource<Collection>();
  public isLoading = true;
  public isChoirAdmin = false;
  public isAdmin = false;
  public viewMode: 'collections' | 'pieces' = 'collections';
  public pageSizeOptions: number[] = [10, 25, 50];
  public pageSize = 10;
  private _sort!: MatSort;
  @ViewChild(MatSort) set sort(sort: MatSort) {
    if (sort) {
      this._sort = sort;
      this.dataSource.sort = this._sort;
    }
  }

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  public displayedColumns: string[] = ['cover', 'status', 'title', 'titles', 'publisher', 'actions'];

  constructor(
    public apiService: ApiService,
    private snackBar: MatSnackBar,
    private router: Router,
    private authService: AuthService,
    private paginatorService: PaginatorService
  ) {
    this.pageSize = this.paginatorService.getPageSize('collection-list', this.pageSizeOptions[0]);
  }

  ngOnInit(): void {
    this.loadCollections();
    this.apiService.checkChoirAdminStatus().subscribe(r => this.isChoirAdmin = r.isChoirAdmin);
    this.authService.isAdmin$.subscribe(v => this.isAdmin = v);
  }

  ngAfterViewInit(): void {
    if (this.paginator) {
      this.paginator.pageSize = this.pageSize;
      this.dataSource.paginator = this.paginator;
      this.paginator.page.subscribe(e => this.paginatorService.setPageSize('collection-list', e.pageSize));
    }
  }

  loadCollections(): void {
    this.isLoading = true;
    this.apiService.getCollections().subscribe(collections => {
      const coverRequests = collections
        .filter(c => c.coverImage)
        .map(c => this.apiService.getCollectionCover(c.id).pipe(map(data => ({ id: c.id, data }))));

      if (coverRequests.length) {
        forkJoin(coverRequests).subscribe(results => {
          results.forEach(res => {
            const col = collections.find(c => c.id === res.id);
            if (col) col.coverImageData = res.data;
          });
          this.dataSource.data = collections;
          this.isLoading = false;
        });
      } else {
        this.dataSource.data = collections;
        this.isLoading = false;
      }
    });
  }


  syncCollection(collection: Collection): void {
    this.apiService.addCollectionToChoir(collection.id).subscribe({
      next: () => {
        const msg = collection.isAdded
          ? `Sammlung '${collection.title}' wurde aktualisiert.`
          : `Sammlung '${collection.title}' wurde zum Chorrepertoire hinzugefügt.`;
        this.snackBar.open(msg, 'OK', {
          duration: 3000,
          verticalPosition: 'top'
        });
        this.loadCollections();
      },
      error: (err) => {
        this.snackBar.open(`Fehler beim Aktualisieren der Sammlung: ${err.message}`, 'Schließen', {
          duration: 5000,
          verticalPosition: 'top'
        });
      }
    });
  }

  openCollection(collection: Collection): void {
    this.router.navigate(['/collections/edit', collection.id]);
  }

  onViewChange(value: 'collections' | 'pieces'): void {
    if (value === 'pieces') {
      this.router.navigate(['/collections/pieces']);
    }
  }
}
