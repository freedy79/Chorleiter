import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from 'src/app/core/services/api.service';
import { Author } from 'src/app/core/models/author';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { ComposerDialogComponent } from '@features/composers/composer-dialog/composer-dialog.component';

@Component({
  selector: 'app-manage-authors',
  standalone: true,
  templateUrl: './manage-authors.component.html',
  styleUrls: ['./manage-authors.component.scss'],
  imports: [CommonModule, MaterialModule]
})
export class ManageAuthorsComponent implements OnInit {
  authors: Author[] = [];
  displayedColumns = ['name', 'birthYear', 'deathYear', 'actions'];
  dataSource = new MatTableDataSource<Author>();

  constructor(private api: ApiService, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.loadAuthors();
  }

  loadAuthors(): void {
    this.api.getAuthors().subscribe(data => {
      this.authors = data;
      this.dataSource.data = data;
    });
  }

  addAuthor(): void {
    const ref = this.dialog.open(ComposerDialogComponent, {
      width: '500px',
      data: { role: 'author' }
    });
    ref.afterClosed().subscribe(result => {
      if (result) {
        this.api.createAuthor(result).subscribe(() => this.loadAuthors());
      }
    });
  }

  editAuthor(author: Author): void {
    const ref = this.dialog.open(ComposerDialogComponent, {
      width: '500px',
      data: { role: 'author', record: author }
    });
    ref.afterClosed().subscribe(result => {
      if (result) {
        this.api.updateAuthor(author.id, result).subscribe(() => this.loadAuthors());
      }
    });
  }

  deleteAuthor(author: Author): void {
    if (!author.canDelete) return;
    if (confirm('Delete author?')) {
      this.api.deleteAuthor(author.id).subscribe(() => this.loadAuthors());
    }
  }
}
