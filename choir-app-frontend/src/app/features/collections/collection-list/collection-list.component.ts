import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { MaterialModule } from '@modules/material.module';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '@core/services/api.service';
import { Collection } from '@core/models/collection';
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
  // Use a BehaviorSubject to hold the data, allowing us to update it.
  private collectionsSubject = new BehaviorSubject<Collection[]>([]);
  public collections$ = this.collectionsSubject.asObservable();

  // Define the columns for the mat-table
  public displayedColumns: string[] = ['cover', 'status', 'title', 'titles', 'publisher', 'actions'];

  constructor(
    public apiService: ApiService,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.loadCollections();
  }

  loadCollections(): void {
    this.apiService.getCollections().subscribe(collections => {
      this.collectionsSubject.next(collections);
    });
  }


  addCollectionToChoir(collection: Collection): void {
    this.apiService.addCollectionToChoir(collection.id).subscribe({
      next: () => {
        this.snackBar.open(`Collection '${collection.title}' added to your choir.`, 'OK', {
          duration: 3000,
          verticalPosition: 'top'
        });
        // Simply reload the list to get the updated 'isAdded' status.
        this.loadCollections();
      },
      error: (err) => {
        this.snackBar.open(`Error adding collection: ${err.message}`, 'Close', {
          duration: 5000,
          verticalPosition: 'top'
        });
      }
    });
  }
}
