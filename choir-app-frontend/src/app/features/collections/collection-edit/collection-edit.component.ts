import {
    AfterViewInit,
    Component,
    ElementRef,
    OnInit,
    ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
    ReactiveFormsModule,
    FormBuilder,
    FormGroup,
    Validators,
    FormControl,
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, startWith, switchMap, tap } from 'rxjs/operators';
import {
    MatAutocompleteModule,
    MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
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

interface SelectedPieceWithNumber {
    piece: Piece;
    numberInCollection: string;
}

@Component({
    selector: 'app-collection-edit',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MaterialModule,
        MatAutocompleteModule,
    ],
    templateUrl: './collection-edit.component.html',
    styleUrls: ['./collection-edit.component.scss'],
})
export class CollectionEditComponent implements OnInit, AfterViewInit {
    collectionForm: FormGroup;
    addPieceForm: FormGroup;
    isEditMode = false;
    private collectionId: number | null = null;
    pageTitle = 'Neue Sammlung erstellen';
    pageSubtitle =
        "Beschreibung der Sammlung, Hinzufügen von Stücken.";
    public pieceLinkColumns: string[] = ['number', 'title', 'actions'];
    pieceCtrl = new FormControl<string | Piece>('');
    filteredPieces$!: Observable<Piece[]>;
    allPieces: Piece[] = [];
    selectedPieceLinks: SelectedPieceWithNumber[] = [];
    coverPreview: string | null = null;
    coverFile: File | null = null;
    isDragOver = false;
    public readonly addNewPieceOption: Piece = {
        id: -1,
        title: 'Neues Stück anlegen...',
    };
    @ViewChild('pieceInput') pieceInput!: ElementRef<HTMLInputElement>;

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
            this._paginator.page.subscribe(e => this.paginatorService.setPageSize('collection-edit', e.pageSize));
        }
    }

    constructor(
        private fb: FormBuilder,
        private apiService: ApiService,
        private snackBar: MatSnackBar,
        private router: Router,
        private route: ActivatedRoute,
        public dialog: MatDialog,
        private paginatorService: PaginatorService
    ) {
        this.collectionForm = this.fb.group({
            title: ['', Validators.required],
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
        // --- Determine Edit/Create Mode (No Change Here) ---
        this.route.paramMap
            .pipe(
                switchMap((params) => {
                    const id = params.get('id');
                    if (id) {
                        this.isEditMode = true;
                        this.collectionId = +id;
                        this.pageTitle = 'Sammlung bearbeiten';
                        this.pageSubtitle =
                            "Update the collection's details and manage its pieces.";
                        return this.apiService.getCollectionById(
                            this.collectionId
                        );
                    }
                    return of(null);
                })
            )
            .subscribe((collectionData) => {
                if (this.isEditMode && collectionData) {
                    this.populateForm(collectionData);
                }
            });

        // --- Setup for Autocomplete (THIS IS THE CORE FIX) ---
        // Fetch all global pieces first.
        this.apiService.getGlobalPieces().subscribe((pieces) => {
            //console.log('Fetched pieces:', pieces);
            if (!pieces || pieces.length === 0) {
                console.warn('No pieces found, initializing with empty array.');
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
                case 'number':
                    // Wir versuchen, die Nummer als Zahl zu parsen, um eine korrekte numerische Sortierung zu ermöglichen.
                    const num = parseInt(link.numberInCollection, 10);
                    return isNaN(num) ? link.numberInCollection : num; // Fallback auf String-Sortierung, falls es keine Zahl ist
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
            map((value) => {
                const searchString =
                    typeof value === 'string' ? value : value?.title || '';
                const filteredPieces = this._filter(searchString);
                return [this.addNewPieceOption, ...filteredPieces];
            })
            // ADD THIS TAP OPERATOR FOR DEBUGGING
            /*tap(filteredList => {
            console.log('Autocomplete is emitting:', filteredList);
        })*/
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
    public displayPiece = (piece: Piece): string => {
        if (piece?.id === this.addNewPieceOption.id) {
            return '';
        }
        return piece && piece.title ? piece.title : '';
    };

    // --- Event Handlers and other methods (No Changes Here) ---

    onSave(): void {
        if (this.collectionForm.invalid) return;

        const formValue = this.collectionForm.value;
        const payload = {
            ...formValue,
            pieces: this.selectedPieceLinks.map((link) => ({
                pieceId: link.piece.id,
                numberInCollection: link.numberInCollection,
            })),
        };

        let saveObservable: Observable<any>;
        if (this.isEditMode && this.collectionId) {
            saveObservable = this.apiService.updateCollection(
                this.collectionId,
                payload
            );
        } else {
            saveObservable = this.apiService.createCollection(payload);
        }

        saveObservable.subscribe({
            next: (response) => {
                const id = this.isEditMode ? this.collectionId! : response.id;
                const afterSave = () => this.router.navigate(['/collections']);

                const upload$ = this.coverFile
                    ? this.apiService.uploadCollectionCover(id, this.coverFile)
                    : of(null);

                upload$.subscribe({ next: afterSave, error: afterSave });

                const message = this.isEditMode
                    ? 'Die Sammlung wurde erfolgreich aktualisiert.'
                    : 'Die Sammlung wurde erfolgreich erstellt.';
                this.snackBar.open(message, 'OK', {
                    duration: 3000,
                    verticalPosition: 'top',
                });
            },
            error: (err) => {
                this.snackBar.open(`Error: ${err.message}`, 'Close', {
                    duration: 5000,
                    verticalPosition: 'top',
                });
            },
        });
    }

    populateForm(collection: Collection): void {
        this.collectionForm.patchValue({
            title: collection.title,
            publisher: collection.publisher,
            prefix: collection.prefix,
            publisherNumber: collection.publisherNumber,
            description: collection.description,
            singleEdition: collection.singleEdition,
        });

        if (collection.coverImage) {
            this.apiService.getCollectionCover(collection.id).subscribe(data => this.coverPreview = data);
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
        const selectedPiece = event.option.value as Piece;
        if (selectedPiece.id === this.addNewPieceOption.id) {
            this.openAddPieceDialog();
        } else {
            this.addPieceForm.patchValue({ piece: selectedPiece });
            this.proposeNextNumber();
        }
    }

    openAddPieceDialog(): void {
        this.pieceCtrl.setValue('');
        const pieceDialogRef = this.dialog.open(PieceDialogComponent, {
            width: '90vw',
            maxWidth: '800px',
            disableClose: true,
            data: { pieceId: null },
        });
        pieceDialogRef
            .afterClosed()
            .subscribe((newPiece: Piece | undefined) => {
                if (newPiece) {
                    this.allPieces.push(newPiece);
                    this.addPieceForm.patchValue({ piece: newPiece });
                    this.proposeNextNumber();
                }
            });
    }

    openEditPieceDialog(pieceId: number): void {
        const dialogRef = this.dialog.open(PieceDialogComponent, {
            width: '90vw',
            maxWidth: '800px',
            disableClose: true,
            data: { pieceId }
        });

        dialogRef.afterClosed().subscribe(wasUpdated => {
            if (wasUpdated) {
                this.apiService.getPieceById(pieceId).subscribe(updatedPiece => {
                    const idx = this.allPieces.findIndex(p => p.id === pieceId);
                    if (idx !== -1) this.allPieces[idx] = updatedPiece;
                    this.selectedPieceLinks = this.selectedPieceLinks.map(link =>
                        link.piece.id === pieceId ? { ...link, piece: updatedPiece } : link
                    );
                    this.updateDataSource();
                });
            }
        });
    }

    addPieceToCollection(): void {
        if (this.addPieceForm.invalid) return;
        if (this.collectionForm.value.singleEdition && this.selectedPieceLinks.length >= 1) {
            this.snackBar.open('Einzelausgabe: nur ein Stück erlaubt.', 'OK', { duration: 3000 });
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
        this.updateDataSource();

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
            const numA = parseInt(a.numberInCollection, 10);
            const numB = parseInt(b.numberInCollection, 10);
            // Wenn beide Zahlen sind, vergleiche sie numerisch
            if (!isNaN(numA) && !isNaN(numB)) {
                return numA - numB;
            }
            // Ansonsten, vergleiche als Text (Fallback)
            return a.numberInCollection.localeCompare(b.numberInCollection);
        });
    }

    private updateDataSource(): void {
        // Assign the new array to the .data property of the datasource
        this.pieceLinkDataSource.data = this.selectedPieceLinks;

        // The datasource automatically informs the table and paginator of the change.
        // If the paginator is already set, we can optionally move to the first page.
        if (this.pieceLinkDataSource.paginator) {
            this.pieceLinkDataSource.paginator.firstPage();
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
        this.coverFile = file;
        const reader = new FileReader();
        reader.onload = () => (this.coverPreview = reader.result as string);
        reader.readAsDataURL(file);
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

        dialogRef.afterClosed().subscribe((wasImported) => {
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
}
