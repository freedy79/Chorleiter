import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/core/services/api.service';
import { Composer } from 'src/app/core/models/composer';
import { MatTableDataSource } from '@angular/material/table';
import { MaterialModule } from '@modules/material.module';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { ComposerDialogComponent } from '@features/composers/composer-dialog/composer-dialog.component';
// ...
@Component({
  selector: 'app-admin-manage-composers',
  templateUrl: './manage-composers.component.html',
  styleUrl: './manage-composers.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    MaterialModule,
  ]
})
export class ManageComposersComponent implements OnInit {
  composers: Composer[] = [];
  displayedColumns = ['name', 'birthYear', 'deathYear', 'actions'];
  dataSource = new MatTableDataSource<Composer>();

  constructor(private adminApiService: ApiService, private dialog: MatDialog) {}

  ngOnInit() {
    this.loadComposers();
  }

  loadComposers(): void {
    this.adminApiService.getComposers().subscribe((data) => {
      this.composers = data;
      this.dataSource.data = data;
    });
  }

  addComposer(): void {
    const ref = this.dialog.open(ComposerDialogComponent, {
      width: '500px',
      data: { role: 'composer' }
    });
    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.adminApiService.createComposer(result).subscribe(() => this.loadComposers());
      }
    });
  }

  editComposer(composer: Composer): void {
    const ref = this.dialog.open(ComposerDialogComponent, {
      width: '500px',
      data: { role: 'composer', record: composer }
    });
    ref.afterClosed().subscribe(result => {
      if (result) {
        this.adminApiService.updateComposer(composer.id, result).subscribe(() => this.loadComposers());
      }
    });
  }

  deleteComposer(composer: Composer): void {
    if (!composer.canDelete) return;
    if (confirm('Delete composer?')) {
      this.adminApiService.deleteComposer(composer.id).subscribe(() => this.loadComposers());
    }
  }
}
