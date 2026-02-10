import {
    AfterViewInit,
    Component,
    ElementRef,
    OnInit,
    ViewChild,
    OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
    ReactiveFormsModule,
    FormsModule,
    FormBuilder,
    FormGroup,
    Validators,
    FormControl,
} from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { Observable, of, combineLatest, Subscription, timer } from 'rxjs';
import { map, startWith, switchMap, takeWhile, takeUntil } from 'rxjs/operators';
import { BaseComponent } from '@shared/components/base.component';
import {
    MatAutocompleteModule,
    MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatDialog } from '@angular/material/dialog';
import { NotificationService } from '@core/services/notification.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { AuthService } from '@core/services/auth.service';
import { ImportDialogComponent } from '../import-dialog/import-dialog.component';

import { MaterialModule } from '@modules/material.module';
import { ApiService } from 'src/app/core/services/api.service';
import { Piece } from 'src/app/core/models/piece';
import { Collection } from 'src/app/core/models/collection';
import { PieceDialogComponent } from '../../literature/piece-dialog/piece-dialog.component';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { PaginatorService } from '@core/services/paginator.service';
import { MatSort } from '@angular/material/sort';
import { Publisher } from '@core/models/publisher';

interface SelectedPieceWithNumber {
    piece: Piece;
    numberInCollection: string;
}

@Component({
    selector: 'app-collection-edit',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        MaterialModule,
        MatAutocompleteModule,
        RouterModule,
    ],
    templateUrl: './collection-edit.component.html',
    styleUrls: ['./collection-edit.component.scss'],
})
export class CollectionEditComponent extends BaseComponent implements OnInit, AfterViewInit, OnDestroy {
    collectionForm: FormGroup;
    addPieceForm: FormGroup;
    isEditMode = false;
    private collectionId: number | null = null;
    pageSubtitle =
        "Beschreibung der Sammlung, Hinzufügen von Stücken.";
    public pieceLinkColumns: string[] = ['number', 'title', 'actions'];
    pieceCtrl = new FormControl<string | (Piece & { isNew?: boolean })>('');
    filteredPieces$!: Observable<(Piece & { isNew?: boolean })[]>;
    allPieces: Piece[] = [];
    publisherCtrl = new FormControl<string>('');
    publishers: Publisher[] = [];
    filteredPublishers$!: Observable<string[]>;
    selectedPieceLinks: SelectedPieceWithNumber[] = [];
    coverPreview: string | null = null;
    coverFile: File | null = null;
    isDragOver = false;
    isAdmin = false;
    isChoirAdmin = false;
    readonly addNewPieceId = -1;
    @ViewChild('pieceInput') pieceInput!: ElementRef<HTMLInputElement>;
    isSaving = false;
    private statusSub?: Subscription;

    public pieceLinkDataSource =
        new MatTableDataSource<SelectedPieceWithNumber>([]);
    pageSizeOptions: number[] = [10, 20, 50];
    pageSize = 10;

    private _sort!: MatSort;
    @ViewChild(MatSort) set sort(sort: MatSort) {
        if (sort) {
            this._sort = sort;
            this.pieceLinkDataSource.sort = this._sort;
        }
    }

    private _paginator!: MatPaginator;
    @ViewChild(MatPaginator) set paginator(paginator: MatPaginator) {
        if (paginator) {
            this._paginator = paginator;
            this._paginator.pageSize = this.pageSize;
            this.pieceLinkDataSource.paginator = this._paginator;
            this._paginator.page.pipe(
                takeUntil(this.destroy$)
            ).subscribe(e => {
                this.pageSize = e.pageSize;
                this.paginatorService.setPageSize('collection-edit', e.pageSize);
            });
        }
    }

    constructor(
        private fb: FormBuilder,
        private apiService: ApiService,
        private notification: NotificationService,
        private router: Router,
        private route: ActivatedRoute,
        public dialog: MatDialog,
        private paginatorService: PaginatorService,
        private authService: AuthService
    ) {
        super(); // Call BaseComponent constructor
        this.collectionForm = this.fb.group({
            title: ['', Validators.required],
            subtitle: [''],
            publisher: [''],
            prefix: [''],
            publisherNumber: [''],
            description: [''],
            singleEdition: [false],
        });

        this.addPieceForm = this.fb.group({
            piece: [null, Validators.required],
            number: ['', Validators.required],
        });

        this.pageSize = this.paginatorService.getPageSize('collection-edit', this.pageSizeOptions[0]);
    }

    ngOnInit(): void {
        // --- Determine Edit/Create Mode FIRST (before auth check) ---
        this.route.paramMap
            .pipe(
                switchMap((params) => {
                    const id = params.get('id');
                    if (id) {
                        this.isEditMode = true;
                        this.collectionId = +id;
                        this.pageSubtitle =
                            "Sammlungsdetails und Stücke verwalten";
                        return this.apiService.getCollectionById(
                            this.collectionId
                        );
                    }
                    this.isEditMode = false;
                    return of(null);
                }),
                takeUntil(this.destroy$)
            )
            .subscribe((collectionData) => {
                if (this.isEditMode && collectionData) {
                    this.populateForm(collectionData);
                }
            });

        combineLatest([this.authService.isAdmin$, this.authService.isChoirAdmin$]).pipe(
            takeUntil(this.destroy$)
        ).subscribe(([isAdmin, isChoirAdmin]) => {
            this.isAdmin = isAdmin;
            this.isChoirAdmin = isChoirAdmin;
            if (!this.isAdmin && !this.isChoirAdmin) {
                this.router.navigate(['/collections']);
                this.notification.error('Keine Berechtigung Sammlungen zu bearbeiten.');
            }
        });
        this.apiService.getPublishers().pipe(
            takeUntil(this.destroy$)
        ).subscribe(list => {
            this.publishers = list;
            this.setupPublisherAutocomplete();
        });
        this.collectionForm.get('publisher')?.valueChanges.pipe(
            takeUntil(this.destroy$)
        ).subscribe(v => {
            this.publisherCtrl.setValue(v || '', { emitEvent: false });
        });
        this.publisherCtrl.valueChanges.pipe(
            takeUntil(this.destroy$)
        ).subscribe(v => {
            this.collectionForm.get('publisher')?.setValue(v);
        });

        // --- Setup for Autocomplete (THIS IS THE CORE FIX) ---
        // Fetch all global pieces first.
        this.apiService.getGlobalPieces().pipe(
            takeUntil(this.destroy$)
        ).subscribe((pieces) => {
            //console.log('Fetched pieces:', pieces);
            if (!pieces || pieces.length === 0) {
                pieces = [];
            }
            // Assign the fetched pieces to allPieces.
            this.allPieces = pieces;
            // Initialize the filteredPieces$ observable ONLY AFTER allPieces is populated.
            this.initializeAutocomplete();
        });
    }

    ngAfterViewInit(): void {
        this.pieceLinkDataSource.sort = this._sort;
        this.pieceLinkDataSource.paginator = this._paginator;

        // --- BENUTZERDEFINIERTE SORTIERLOGIK ---
        this.pieceLinkDataSource.sortingDataAccessor = (
            link: SelectedPieceWithNumber,
            property: string
        ) => {
            switch (property) {
                case 'title':
                    return link.piece.title.toLowerCase();
                case 'number': {
                    // Versuche die numerische und alphanumerische Komponente zu trennen
                    const match = link.numberInCollection.match(/^(\d+)([a-zA-Z]*)$/);
                    if (match) {
                        const base = parseInt(match[1], 10);
                        const suffix = match[2] ? match[2].toLowerCase().charCodeAt(0) / 100 : 0;
                        return base + suffix;
                    }
                    return link.numberInCollection;
                }
                default:
                    return (link as any)[property];
            }
        };
    }

    /**
     * Sets up the reactive stream for the autocomplete functionality.
     */
    private initializeAutocomplete(): void {
        this.filteredPieces$ = this.pieceCtrl.valueChanges.pipe(
            startWith(''),
            map(value => {
                const searchString = typeof value === 'string' ? value : value?.title || '';
                const filteredPieces = this._filter(searchString);
                const options = filteredPieces.map(p => ({ ...p }));
                if (
                    searchString &&
                    !filteredPieces.some(p => p.title.toLowerCase() === searchString.toLowerCase())
                ) {
                    options.unshift({ id: this.addNewPieceId, title: searchString, isNew: true } as Piece & { isNew: boolean });
                }
                return options;
            })
        );
    }

    private setupPublisherAutocomplete(): void {
        this.filteredPublishers$ = this.publisherCtrl.valueChanges.pipe(
            startWith(''),
            map(value => {
                const search = (value || '').toLowerCase();
                return this.publishers
                    .map(p => p.name)
                    .filter(name => name.toLowerCase().includes(search));
            })
        );
    }

    /**
     * The filtering logic. It takes a search string and returns a list of available pieces.
     */
    private _filter(search: string): Piece[] {
        const filterValue = search.toLowerCase();
        // Get the IDs of pieces already selected so we can exclude them
        const selectedIds = new Set(
            this.selectedPieceLinks.map((link) => link.piece.id)
        );

        return this.allPieces.filter((piece) => {
            const isNotSelected = !selectedIds.has(piece.id);
            const titleMatches = piece.title
                .toLowerCase()
                .includes(filterValue);
            return isNotSelected && titleMatches;
        });
    }

    // --- `displayWith` Function (Arrow function to preserve 'this') ---
    public displayPiece = (piece: Piece & { isNew?: boolean }): string => {
        return piece ? piece.title : '';
    };

    onPublisherSelected(event: MatAutocompleteSelectedEvent): void {
        const value = event.option.value;
        this.collectionForm.get('publisher')?.setValue(value);
    }

    // --- Event Handlers and other methods (No Changes Here) ---

    onSave(): void {
        if (this.collectionForm.invalid) return;

        const proceed = () => {
            const formValue = this.collectionForm.value;
            const payload = {
                ...formValue,
                pieces: this.selectedPieceLinks.map((link) => ({
                    pieceId: link.piece.id,
                    numberInCollection: link.numberInCollection,
                })),
            };

            if (this.isEditMode && this.collectionId) {
                this.isSaving = true;
                this.apiService.updateCollection(this.collectionId, payload).pipe(
                    takeUntil(this.destroy$)
                ).subscribe({
                    next: (response) => this.pollUpdateStatus(response.jobId),
                    error: (err) => {
                        this.isSaving = false;
                        let message = err.error?.message || err.error || err.message || 'Unbekannter Fehler beim Speichern.';
                        if (err.status === 400 && !err.error?.message && typeof err.error !== 'string') {
                            message = 'Ungültige Eingaben. Bitte prüfen Sie die Angaben.';
                        }
                        const title = this.collectionForm.value.title;
                        const context = title ? ` der Sammlung '${title}'` : '';
                        this.notification.error(`Fehler beim Aktualisieren${context}: ${message}`, 5000);
                    },
                });
            } else {
                this.apiService.createCollection(payload).pipe(
                    takeUntil(this.destroy$)
                ).subscribe({
                    next: (response) => {
                        const id = response.id;
                        const afterSave = () => this.router.navigate(['/collections']);
                        const upload$ = this.coverFile
                            ? this.apiService.uploadCollectionCover(id, this.coverFile)
                            : of(null);
                        upload$.pipe(
                            takeUntil(this.destroy$)
                        ).subscribe({ next: afterSave, error: afterSave });
                        this.notification.success('Die Sammlung wurde erfolgreich erstellt.', 3000);
                    },
                    error: (err) => {
                        let message = err.error?.message || err.error || err.message || 'Unbekannter Fehler beim Speichern.';
                        if (err.status === 400 && !err.error?.message && typeof err.error !== 'string') {
                            message = 'Ungültige Eingaben. Bitte prüfen Sie die Angaben.';
                        }
                        const title = this.collectionForm.value.title;
                        const context = title ? ` der Sammlung '${title}'` : '';
                        this.notification.error(`Fehler beim Erstellen${context}: ${message}`, 5000);
                    },
                });
            }
        };

        if (this.selectedPieceLinks.length === 0) {
            const dialogData: ConfirmDialogData = {
                title: 'Leere Sammlung speichern?',
                message: 'Diese Sammlung enthält keine Stücke. Möchten Sie sie trotzdem speichern?',
                confirmButtonText: 'Speichern',
                cancelButtonText: 'Abbrechen',
            };
            const ref = this.dialog.open(ConfirmDialogComponent, { data: dialogData });
            ref.afterClosed().pipe(
                takeUntil(this.destroy$)
            ).subscribe((confirmed) => {
                if (confirmed) {
                    proceed();
                }
            });
        } else {
            proceed();
        }
    }

    private pollUpdateStatus(jobId: string): void {
        if (this.statusSub) {
            this.statusSub.unsubscribe();
        }
        this.statusSub = timer(0, 500).pipe(
            switchMap(() => this.apiService.getCollectionUpdateStatus(jobId)),
            takeWhile((job) => job.status === 'running', true),
            takeUntil(this.destroy$)
        ).subscribe({
            next: (job) => {
                if (job.status === 'completed') {
                    const id = this.collectionId!;
                    const afterSave = () => this.router.navigate(['/collections']);
                    const upload$ = this.coverFile
                        ? this.apiService.uploadCollectionCover(id, this.coverFile)
                        : of(null);
                    upload$.pipe(
                        takeUntil(this.destroy$)
                    ).subscribe({ next: afterSave, error: afterSave });
                    this.notification.success('Die Sammlung wurde erfolgreich aktualisiert.', 3000);
                    this.isSaving = false;
                } else if (job.status === 'failed') {
                    this.notification.error(`Fehler beim Aktualisieren der Sammlung: ${job.error}`, 5000);
                    this.isSaving = false;
                }
            },
            error: () => {
                this.notification.error('Fehler beim Abrufen des Update-Status.', 5000);
                this.isSaving = false;
            },
        });
    }

    override ngOnDestroy(): void {
        // BaseComponent.ngOnDestroy() will handle all subscriptions using takeUntil(this.destroy$)
        super.ngOnDestroy();
    }

    populateForm(collection: Collection): void {
        this.collectionForm.patchValue({
            title: collection.title,
            subtitle: collection.subtitle,
            publisher: collection.publisher,
            prefix: collection.prefix,
            publisherNumber: collection.publisherNumber,
            description: collection.description,
            singleEdition: collection.singleEdition,
        });
        this.publisherCtrl.setValue(collection.publisher || '');

        if (collection.coverImage) {
            this.apiService.getCollectionCover(collection.id).pipe(
                takeUntil(this.destroy$)
            ).subscribe(data => this.coverPreview = data);
        }

        if (collection.pieces) {
            this.selectedPieceLinks = collection.pieces.map((piece) => ({
                piece: piece,
                numberInCollection: (piece as any).collection_piece
                    .numberInCollection,
            }));
            this.sortPieceLinksByNumber();
            this.updateDataSource();
        }
    }

    onPieceSelected(event: MatAutocompleteSelectedEvent): void {
        const selectedPiece = event.option.value as Piece & { isNew?: boolean };
        if (selectedPiece.isNew || selectedPiece.id === this.addNewPieceId) {
            this.openAddPieceDialog(selectedPiece.title);
        } else {
            this.addPieceForm.patchValue({ piece: selectedPiece });
            this.proposeNextNumber();
        }
    }

    openAddPieceDialog(prefillTitle?: string): void {
        this.pieceCtrl.setValue('');
        const pieceDialogRef = this.dialog.open(PieceDialogComponent, {
            width: '90vw',
            maxWidth: '1000px',
            disableClose: true,
            data: { pieceId: null, initialTitle: prefillTitle },
        });
        pieceDialogRef
            .afterClosed()
            .pipe(
                takeUntil(this.destroy$)
            )
            .subscribe((newPiece: Piece | undefined) => {
                if (newPiece) {
                    this.allPieces.push(newPiece);
                    this.addPieceForm.patchValue({ piece: newPiece });
                    this.pieceCtrl.setValue(newPiece);
                    this.proposeNextNumber();
                }
            });
    }

    openEditPieceDialog(pieceId: number): void {
        const dialogRef = this.dialog.open(PieceDialogComponent, {
            width: '90vw',
            maxWidth: '1000px',
            data: { pieceId }
        });

        dialogRef.afterClosed().pipe(
            takeUntil(this.destroy$)
        ).subscribe((wasUpdated) => {
            if (wasUpdated) {
                this.apiService.getPieceById(pieceId).pipe(
                    takeUntil(this.destroy$)
                ).subscribe((updatedPiece) => {
                    const allIndex = this.allPieces.findIndex((p) => p.id === updatedPiece.id);
                    if (allIndex !== -1) {
                        this.allPieces[allIndex] = updatedPiece;
                    }
                    const linkIndex = this.selectedPieceLinks.findIndex(
                        (l) => l.piece.id === updatedPiece.id
                    );
                    if (linkIndex !== -1) {
                        this.selectedPieceLinks[linkIndex].piece = updatedPiece;
                        this.updateDataSource();
                    }
                });
            }
        });
    }

    addPieceToCollection(): void {
        if (this.addPieceForm.invalid) return;
        if (this.collectionForm.value.singleEdition && this.selectedPieceLinks.length >= 1) {
            this.notification.warning('Einzelausgabe: nur ein Stück erlaubt.', 3000);
            return;
        }

        const piece = this.addPieceForm.value.piece as Piece;
        const number = this.addPieceForm.value.number;
        const newLink: SelectedPieceWithNumber = {
            piece: piece,
            numberInCollection: number,
        };

        // Use spread syntax to create a new array reference for change detection
        this.selectedPieceLinks = [...this.selectedPieceLinks, newLink];

        this.sortPieceLinksByNumber();
        this.updateDataSource(true);

        this.addPieceForm.reset();
        this.pieceCtrl.setValue('');
    }

    removePieceFromCollection(pieceToRemove: Piece): void {
        this.selectedPieceLinks = this.selectedPieceLinks.filter(
            (link) => link.piece.id !== pieceToRemove.id
        );
        this.updateDataSource();
    }

    private sortPieceLinksByNumber(): void {
        this.selectedPieceLinks.sort((a, b) => {
            const pattern = /^(\d+)([a-zA-Z]*)$/;
            const matchA = a.numberInCollection.match(pattern);
            const matchB = b.numberInCollection.match(pattern);
            if (matchA && matchB) {
                const baseA = parseInt(matchA[1], 10);
                const baseB = parseInt(matchB[1], 10);
                if (baseA !== baseB) {
                    return baseA - baseB;
                }
                return matchA[2].localeCompare(matchB[2]);
            }
            return a.numberInCollection.localeCompare(b.numberInCollection);
        });
    }

    private updateDataSource(goToLastPage = false): void {
        // Assign the new array to the .data property of the datasource
        this.pieceLinkDataSource.data = [...this.selectedPieceLinks];

        // Move paginator to requested page after data change
        if (this.pieceLinkDataSource.paginator) {
            if (goToLastPage) {
                this.pieceLinkDataSource.paginator.lastPage();
            } else {
                this.pieceLinkDataSource.paginator.firstPage();
            }
        }
    }

    private proposeNextNumber(): void {
        if (this.selectedPieceLinks.length === 0) {
            this.addPieceForm.patchValue({ number: '1' });
            return;
        }
        const maxNumber = this.selectedPieceLinks.reduce((max, link) => {
            const currentNum = parseInt(link.numberInCollection, 10);
            return !isNaN(currentNum) && currentNum > max ? currentNum : max;
        }, 0);
        this.addPieceForm.patchValue({ number: (maxNumber + 1).toString() });
    }

    onFileSelected(event: Event): void {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (file) this.handleFile(file);
    }

    onDragOver(event: DragEvent): void {
        event.preventDefault();
        this.isDragOver = true;
    }

    onDragLeave(event: DragEvent): void {
        event.preventDefault();
        this.isDragOver = false;
    }

    onDrop(event: DragEvent): void {
        event.preventDefault();
        this.isDragOver = false;
        const file = event.dataTransfer?.files?.[0];
        if (file) this.handleFile(file);
    }

    private handleFile(file: File): void {
        const proceed = () => {
            this.coverFile = file;
            const reader = new FileReader();
            reader.onload = () => (this.coverPreview = reader.result as string);
            reader.readAsDataURL(file);
        };

        if (this.coverPreview) {
            const dialogData: ConfirmDialogData = {
                title: 'Cover überschreiben?',
                message: 'Es existiert bereits ein Coverbild. Möchten Sie es überschreiben?',
            };
            const ref = this.dialog.open(ConfirmDialogComponent, { data: dialogData });
            ref.afterClosed().pipe(
                takeUntil(this.destroy$)
            ).subscribe(confirmed => {
                if (confirmed) {
                    proceed();
                }
            });
        } else {
            proceed();
        }
    }

    // Fügen Sie diese Methode hinzu
    openImportDialog(): void {
        if (!this.collectionId || !this.collectionForm.value.title) return;

        const dialogRef = this.dialog.open(ImportDialogComponent, {
            width: '800px',
            data: {
                collectionId: this.collectionId,
                collectionTitle: this.collectionForm.value.title,
            },
        });

        dialogRef.afterClosed().pipe(
            takeUntil(this.destroy$)
        ).subscribe((wasImported) => {
            if (wasImported) {
                // Laden Sie die Sammlungsdaten neu, um die neuen Stücke anzuzeigen
                this.router
                    .navigateByUrl('/', { skipLocationChange: true })
                    .then(() => {
                        this.router.navigate([
                            '/collections/edit',
                            this.collectionId,
                        ]);
                    });
            }
        });
    }

    onNumberChanged(): void {
        this.sortPieceLinksByNumber();
        this.updateDataSource();
    }
}
