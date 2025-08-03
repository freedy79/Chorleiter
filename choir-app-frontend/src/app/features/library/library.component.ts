import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { LibraryItem } from '@core/models/library-item';
import { Collection } from '@core/models/collection';
import { Observable } from 'rxjs';
import { AuthService } from '@core/services/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { LibraryItemDialogComponent } from './library-item-dialog.component';

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './library.component.html',
  styleUrls: ['./library.component.scss']
})
export class LibraryComponent implements OnInit {
  items$!: Observable<LibraryItem[]>;
  collections$!: Observable<Collection[]>;
  selectedFile: File | null = null;
  isAdmin = false;
  displayedColumns: string[] = ['title', 'copies', 'status', 'availableAt'];
  
  constructor(private api: ApiService, private auth: AuthService, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.load();
    this.collections$ = this.api.getCollections();
    this.auth.isAdmin$.subscribe(a => this.isAdmin = a);
  }

  load(): void {
    this.items$ = this.api.getLibraryItems();
  }

  onFileChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  upload(): void {
    if (this.selectedFile) {
      this.api.importLibraryCsv(this.selectedFile).subscribe(() => this.load());
    }
  }

  openAddDialog(): void {
    const ref = this.dialog.open(LibraryItemDialogComponent, { data: { collections$: this.collections$ } });
    ref.afterClosed().subscribe(result => {
      if (result) {
        this.api.addLibraryItem(result).subscribe(() => this.load());
      }
    });
  }
}
