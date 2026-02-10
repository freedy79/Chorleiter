import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { ComposerService } from 'src/app/core/services/composer.service';
import { AuthorService } from 'src/app/core/services/author.service';
import { Composer } from 'src/app/core/models/composer';
import { Author } from 'src/app/core/models/author';
import { MatTableDataSource, MatTable } from '@angular/material/table';
import { MaterialModule } from '@modules/material.module';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogHelperService } from '@core/services/dialog-helper.service';
import { MatPaginator } from '@angular/material/paginator';
import { PaginatorService } from '@core/services/paginator.service';
import { PieceService } from '@core/services/piece.service';
import { Piece } from 'src/app/core/models/piece';
import { ComposerDialogComponent } from '@features/composers/composer-dialog/composer-dialog.component';
import { PieceDialogComponent } from '@features/literature/piece-dialog/piece-dialog.component';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
@Component({
  selector: 'app-manage-creators',
  templateUrl: './manage-creators.component.html',
  styleUrls: ['./manage-creators.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MaterialModule,
    RouterModule,
  ]
})
export class ManageCreatorsComponent implements OnInit, AfterViewInit, OnDestroy {
  mode: 'composer' | 'author' = 'composer';
  people: (Composer | Author)[] = [];
  displayedColumns = ['name', 'birthYear', 'deathYear', 'actions'];
  dataSource = new MatTableDataSource<Composer | Author>();
  letters: string[] = ['Alle', 'A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];
  selectedLetter = 'Alle';
  totalPeople = 0;
  pageSizeOptions: number[] = [10, 25, 50];
  pageSize = 10;

  expandedPerson: Composer | Author | null = null;
  expandedPieces: Piece[] = [];

  private destroy$ = new Subject<void>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatTable) table!: MatTable<Composer | Author>;

  constructor(private composerService: ComposerService,
              private authorService: AuthorService,
              private dialogHelper: DialogHelperService,
              private paginatorService: PaginatorService,
              private pieceService: PieceService) {
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
      this.paginator.page
        .pipe(takeUntil(this.destroy$))
        .subscribe(e => this.paginatorService.setPageSize('manage-creators', e.pageSize));
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData(openPersonId?: number, resetPage = true): void {
    const currentIndex = this.paginator ? this.paginator.pageIndex : 0;
    const obs = this.mode === 'composer'
      ? this.composerService.getComposers()
      : this.authorService.getAuthors();

    obs.pipe(takeUntil(this.destroy$)).subscribe((data) => {
      this.people = data;
      this.applyFilter(resetPage);
      if (!resetPage && this.paginator) {
        const maxPageIndex = Math.max(0, Math.ceil(this.totalPeople / this.paginator.pageSize) - 1);
        this.paginator.pageIndex = Math.min(currentIndex, maxPageIndex);
        this.dataSource.paginator = this.paginator;
      }
      if (openPersonId) {
        const person = this.people.find(p => p.id === openPersonId);
        if (person) {
          this.toggleRow(person);
        }
      }
    });
  }

  applyFilter(resetPage = true): void {
    let filtered = this.people;
    if (this.selectedLetter !== 'Alle') {
      const letter = this.selectedLetter.toUpperCase();
      filtered = this.people.filter(p => p.name.toUpperCase().startsWith(letter));
    }
    this.dataSource.data = filtered;
    this.totalPeople = filtered.length;
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
      if (resetPage) {
        this.paginator.firstPage();
      } else {
        const maxPageIndex = Math.max(0, Math.ceil(filtered.length / this.paginator.pageSize) - 1);
        this.paginator.pageIndex = Math.min(this.paginator.pageIndex, maxPageIndex);
      }
    }
  }

  onLetterSelect(letter: string): void {
    this.selectedLetter = letter;
    this.applyFilter();
  }

  addPerson(): void {
    this.dialogHelper.openDialog<ComposerDialogComponent, any>(
      ComposerDialogComponent,
      {
        width: '500px',
        data: { role: this.mode }
      }
    ).pipe(takeUntil(this.destroy$)).subscribe(result => {
      if (result) {
        const req = this.mode === 'composer'
          ? this.composerService.createComposer(result)
          : this.authorService.createAuthor(result);
        req.pipe(takeUntil(this.destroy$)).subscribe({
          next: () => this.loadData(),
          error: err => {
            const question = this.mode === 'composer'
              ? 'Komponist existiert bereits. Trotzdem anlegen?'
              : 'Dichter existiert bereits. Trotzdem anlegen?';
            if (err.status === 409) {
              this.dialogHelper.confirm({
                title: 'Duplikat gefunden',
                message: question,
                confirmButtonText: 'Ja, anlegen',
                cancelButtonText: 'Abbrechen'
              }).subscribe(confirmed => {
                if (confirmed) {
                  const forceReq = this.mode === 'composer'
                    ? this.composerService.createComposer(result, true)
                    : this.authorService.createAuthor(result, true);
                  forceReq.pipe(takeUntil(this.destroy$)).subscribe(() => this.loadData());
                }
              });
            }
          }
        });
      }
    });
  }

  editPerson(person: Composer | Author): void {
    this.dialogHelper.openDialog<ComposerDialogComponent, any>(
      ComposerDialogComponent,
      {
        width: '500px',
        data: { role: this.mode, record: person }
      }
    ).pipe(takeUntil(this.destroy$)).subscribe(result => {
      if (result) {
        const req = this.mode === 'composer'
          ? this.composerService.updateComposer(person.id, result)
          : this.authorService.updateAuthor(person.id, result);
        req.pipe(takeUntil(this.destroy$)).subscribe({
          next: () => this.loadData(),
          error: err => {
            const question = this.mode === 'composer'
              ? 'Komponist existiert bereits. Trotzdem speichern?'
              : 'Dichter existiert bereits. Trotzdem speichern?';
            if (err.status === 409) {
              this.dialogHelper.confirm({
                title: 'Duplikat gefunden',
                message: question,
                confirmButtonText: 'Ja, speichern',
                cancelButtonText: 'Abbrechen'
              }).subscribe(confirmed => {
                if (confirmed) {
                  const forceReq = this.mode === 'composer'
                    ? this.composerService.updateComposer(person.id, result, true)
                    : this.authorService.updateAuthor(person.id, result, true);
                  forceReq.pipe(takeUntil(this.destroy$)).subscribe(() => this.loadData());
                }
              });
            }
          }
        });
      }
    });
  }

  deletePerson(person: Composer | Author): void {
    if (!person.canDelete) return;
    const itemName = this.mode === 'composer' ? 'diesen Komponisten' : 'diesen Dichter';
    this.dialogHelper.confirmDelete(
      { itemName },
      () => this.mode === 'composer'
        ? this.composerService.deleteComposer(person.id)
        : this.authorService.deleteAuthor(person.id),
      {
        silent: true,
        onSuccess: () => this.loadData(undefined, false)
      }
    ).subscribe();
  }

  enrichPerson(person: Composer | Author): void {
    const req = this.mode === 'composer'
      ? this.composerService.enrichComposer(person.id)
      : this.authorService.enrichAuthor(person.id);
    req.pipe(takeUntil(this.destroy$)).subscribe(updated => {
      const idx = this.people.findIndex(p => p.id === person.id);
      if (idx !== -1) {
        this.people[idx] = { ...person, ...updated } as Composer | Author;
        this.applyFilter(false);
      }
    });
  }

  isExpansionDetailRow = (_: number, row: Composer | Author) =>
    this.expandedPerson?.id === row.id;

  openEditPieceDialog(event: MouseEvent, pieceId: number): void {
    if (event.ctrlKey || event.metaKey || event.button !== 0) {
      return; // allow default navigation for new tab or new window
    }
    event.preventDefault();
    event.stopPropagation();
    const expandedId = this.expandedPerson?.id;
    this.dialogHelper.openDialog<PieceDialogComponent, boolean>(
      PieceDialogComponent,
      {
        width: '90vw',
        maxWidth: '1000px',
        data: { pieceId }
      }
    ).pipe(takeUntil(this.destroy$)).subscribe(wasUpdated => {
      if (wasUpdated) {
        this.loadData(expandedId);
      }
    });
  }

  toggleRow(person: Composer | Author): void {
    if (this.expandedPerson && this.expandedPerson.id === person.id) {
      this.expandedPerson = null;
      this.expandedPieces = [];
      this.table?.renderRows();
      return;
    }
    const filter = this.mode === 'composer'
      ? { composerId: person.id }
      : { authorId: person.id };

    // Open the row immediately while the pieces are loading
    this.expandedPerson = person;
    this.expandedPieces = [];
    this.table?.renderRows();

    this.pieceService.getGlobalPieces(filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe(pieces => {
        this.expandedPieces = pieces;
        this.table?.renderRows();
      });
  }
}
