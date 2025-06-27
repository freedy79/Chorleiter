import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { ApiService } from '@core/services/api.service';
import { Collection } from '@core/models/collection';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { RouterLink } from '@angular/router'; // Import RouterLink for the template

@Component({
  selector: 'app-collection-list',
  standalone: true,
  imports: [
    CommonModule,
    MaterialModule,
    RouterLink // Add RouterLink to imports
  ],
  templateUrl: './collection-list.component.html',
  styleUrls: ['./collection-list.component.scss']
})
export class CollectionListComponent implements OnInit {
  public dataSource = new MatTableDataSource<Collection>();
  public isLoading = true;
  private _sort!: MatSort;
  @ViewChild(MatSort) set sort(sort: MatSort) {
    if (sort) {
      this._sort = sort;
      this.dataSource.sort = this._sort;
    }
  }

  public displayedColumns: string[] = ['cover', 'status', 'title', 'titles', 'publisher', 'actions'];

  constructor(
    public apiService: ApiService,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.loadCollections();
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


  addCollectionToChoir(collection: Collection): void {
    this.apiService.addCollectionToChoir(collection.id).subscribe({
      next: () => {
        this.snackBar.open(`Sammlung '${collection.title}' wurde zum Chorrepertoire hinzugefügt.`, 'OK', {
          duration: 3000,
          verticalPosition: 'top'
        });
        // Simply reload the list to get the updated 'isAdded' status.
        this.loadCollections();
      },
      error: (err) => {
        this.snackBar.open(`Fehler beim Hinzufügen der Sammlung: ${err.message}`, 'Close', {
          duration: 5000,
          verticalPosition: 'top'
        });
      }
    });
  }
}
