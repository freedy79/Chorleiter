import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { ApiService } from 'src/app/core/services/api.service';
import { Composer } from 'src/app/core/models/composer';
import { MatTableDataSource } from '@angular/material/table';
import { MaterialModule } from '@modules/material.module';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { PaginatorService } from '@core/services/paginator.service';
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
export class ManageComposersComponent implements OnInit, AfterViewInit {
  composers: Composer[] = [];
  displayedColumns = ['name', 'birthYear', 'deathYear', 'actions'];
  dataSource = new MatTableDataSource<Composer>();
  letters: string[] = ['Alle', 'A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];
  selectedLetter = 'Alle';
  totalComposers = 0;
  pageSizeOptions: number[] = [10, 25, 50];
  pageSize = this.paginatorService.getPageSize('manage-composers', this.pageSizeOptions[0]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(private adminApiService: ApiService,
              private dialog: MatDialog,
              private paginatorService: PaginatorService) {}

  ngOnInit() {
    this.loadComposers();
  }

  ngAfterViewInit(): void {
    if (this.paginator) {
      this.paginator.pageSize = this.pageSize;
      this.dataSource.paginator = this.paginator;
      this.applyFilter();
      this.paginator.page.subscribe(e => this.paginatorService.setPageSize('manage-composers', e.pageSize));
    }
  }

  loadComposers(): void {
    this.adminApiService.getComposers().subscribe((data) => {
      this.composers = data;
      this.applyFilter();
    });
  }

  applyFilter(): void {
    let filtered = this.composers;
    if (this.selectedLetter !== 'Alle') {
      const letter = this.selectedLetter.toUpperCase();
      filtered = this.composers.filter(c => c.name.toUpperCase().startsWith(letter));
    }
    this.dataSource.data = filtered;
    this.totalComposers = filtered.length;
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
      this.paginator.firstPage();
    }
  }

  onLetterSelect(letter: string): void {
    this.selectedLetter = letter;
    this.applyFilter();
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
