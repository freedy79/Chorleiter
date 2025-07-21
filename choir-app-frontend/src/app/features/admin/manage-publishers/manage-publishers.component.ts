import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { PublisherService } from '@core/services/publisher.service';
import { Publisher } from '@core/models/publisher';
import { MatTableDataSource } from '@angular/material/table';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { PaginatorService } from '@core/services/paginator.service';
import { PublisherDialogComponent } from './publisher-dialog/publisher-dialog.component';

@Component({
  selector: 'app-manage-publishers',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule],
  templateUrl: './manage-publishers.component.html',
  styleUrls: ['./manage-publishers.component.scss']
})
export class ManagePublishersComponent implements OnInit, AfterViewInit {
  publishers: Publisher[] = [];
  displayedColumns = ['name', 'actions'];
  dataSource = new MatTableDataSource<Publisher>();
  letters: string[] = ['Alle','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];
  selectedLetter = 'Alle';
  totalPublishers = 0;
  pageSizeOptions: number[] = [10, 25, 50];
  pageSize = 10;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(private publisherService: PublisherService,
              private dialog: MatDialog,
              private paginatorService: PaginatorService) {
    this.pageSize = this.paginatorService.getPageSize('manage-publishers', this.pageSizeOptions[0]);
  }

  ngOnInit(): void {
    this.loadPublishers();
  }

  ngAfterViewInit(): void {
    if (this.paginator) {
      this.paginator.pageSize = this.pageSize;
      this.dataSource.paginator = this.paginator;
      this.applyFilter();
      this.paginator.page.subscribe(e => this.paginatorService.setPageSize('manage-publishers', e.pageSize));
    }
  }

  loadPublishers(): void {
    this.publisherService.getPublishers().subscribe(data => {
      this.publishers = data;
      this.applyFilter();
    });
  }

  applyFilter(): void {
    let filtered = this.publishers;
    if (this.selectedLetter !== 'Alle') {
      const letter = this.selectedLetter.toUpperCase();
      filtered = this.publishers.filter(p => p.name.toUpperCase().startsWith(letter));
    }
    this.dataSource.data = filtered;
    this.totalPublishers = filtered.length;
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
      this.paginator.firstPage();
    }
  }

  onLetterSelect(letter: string): void {
    this.selectedLetter = letter;
    this.applyFilter();
  }

  addPublisher(): void {
    const ref = this.dialog.open(PublisherDialogComponent, { width: '400px' });
    ref.afterClosed().subscribe(result => {
      if (result) {
        this.publisherService.createPublisher(result).subscribe(() => {
          this.selectedLetter = 'Alle';
          this.loadPublishers();
        });
      }
    });
  }

  editPublisher(publisher: Publisher): void {
    const ref = this.dialog.open(PublisherDialogComponent, { width: '400px', data: publisher });
    ref.afterClosed().subscribe(result => {
      if (result) {
        this.publisherService.updatePublisher(publisher.id, result).subscribe(() => {
          this.selectedLetter = 'Alle';
          this.loadPublishers();
        });
      }
    });
  }

  deletePublisher(publisher: Publisher): void {
    if (!publisher.canDelete) return;
    if (confirm('Verlag löschen?')) {
      this.publisherService.deletePublisher(publisher.id).subscribe(() => this.loadPublishers());
    }
  }
}
