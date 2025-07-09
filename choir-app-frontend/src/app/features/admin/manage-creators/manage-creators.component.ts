import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { ComposerService } from 'src/app/core/services/composer.service';
import { AuthorService } from 'src/app/core/services/author.service';
import { Composer } from 'src/app/core/models/composer';
import { Author } from 'src/app/core/models/author';
import { MatTableDataSource } from '@angular/material/table';
import { MaterialModule } from '@modules/material.module';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { PaginatorService } from '@core/services/paginator.service';
import { ComposerDialogComponent } from '@features/composers/composer-dialog/composer-dialog.component';
// ...
@Component({
  selector: 'app-manage-creators',
  templateUrl: './manage-creators.component.html',
  styleUrl: './manage-creators.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MaterialModule,
  ]
})
export class ManageCreatorsComponent implements OnInit, AfterViewInit {
  mode: 'composer' | 'author' = 'composer';
  people: (Composer | Author)[] = [];
  displayedColumns = ['name', 'birthYear', 'deathYear', 'actions'];
  dataSource = new MatTableDataSource<Composer | Author>();
  letters: string[] = ['Alle', 'A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];
  selectedLetter = 'Alle';
  totalPeople = 0;
  pageSizeOptions: number[] = [10, 25, 50];
  pageSize = 10;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(private composerService: ComposerService,
              private authorService: AuthorService,
              private dialog: MatDialog,
              private paginatorService: PaginatorService) {
    this.pageSize = this.paginatorService.getPageSize('manage-creators', this.pageSizeOptions[0]);
  }

  ngOnInit() {
    this.loadData();
  }

  ngAfterViewInit(): void {
    if (this.paginator) {
      this.paginator.pageSize = this.pageSize;
      this.dataSource.paginator = this.paginator;
      this.applyFilter();
      this.paginator.page.subscribe(e => this.paginatorService.setPageSize('manage-creators', e.pageSize));
    }
  }

  loadData(): void {
    const obs = this.mode === 'composer'
      ? this.composerService.getComposers()
      : this.authorService.getAuthors();

    obs.subscribe((data) => {
      this.people = data;
      this.applyFilter();
    });
  }

  applyFilter(): void {
    let filtered = this.people;
    if (this.selectedLetter !== 'Alle') {
      const letter = this.selectedLetter.toUpperCase();
      filtered = this.people.filter(p => p.name.toUpperCase().startsWith(letter));
    }
    this.dataSource.data = filtered;
    this.totalPeople = filtered.length;
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
      this.paginator.firstPage();
    }
  }

  onLetterSelect(letter: string): void {
    this.selectedLetter = letter;
    this.applyFilter();
  }

  addPerson(): void {
    const ref = this.dialog.open(ComposerDialogComponent, {
      width: '500px',
      data: { role: this.mode }
    });
    ref.afterClosed().subscribe(result => {
      if (result) {
        const req = this.mode === 'composer'
          ? this.composerService.createComposer(result)
          : this.authorService.createAuthor(result);
        req.subscribe(() => this.loadData());
      }
    });
  }

  editPerson(person: Composer | Author): void {
    const ref = this.dialog.open(ComposerDialogComponent, {
      width: '500px',
      data: { role: this.mode, record: person }
    });
    ref.afterClosed().subscribe(result => {
      if (result) {
        const req = this.mode === 'composer'
          ? this.composerService.updateComposer(person.id, result)
          : this.authorService.updateAuthor(person.id, result);
        req.subscribe(() => this.loadData());
      }
    });
  }

  deletePerson(person: Composer | Author): void {
    if (!person.canDelete) return;
    const question = this.mode === 'composer' ? 'Komponist löschen?' : 'Dichter löschen?';
    if (confirm(question)) {
      const req = this.mode === 'composer'
        ? this.composerService.deleteComposer(person.id)
        : this.authorService.deleteAuthor(person.id);
      req.subscribe(() => this.loadData());
    }
  }

  enrichPerson(person: Composer | Author): void {
    const req = this.mode === 'composer'
      ? this.composerService.enrichComposer(person.id)
      : this.authorService.enrichAuthor(person.id);
    req.subscribe(updated => {
      const idx = this.people.findIndex(p => p.id === person.id);
      if (idx !== -1) {
        this.people[idx] = { ...person, ...updated } as Composer | Author;
        this.applyFilter();
      }
    });
  }
}
