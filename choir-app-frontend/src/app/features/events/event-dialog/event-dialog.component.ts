import {
    Component,
    ElementRef,
    OnInit,
    ViewChild,
    Inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
    ReactiveFormsModule,
    FormBuilder,
    FormGroup,
    Validators,
    FormControl,
} from '@angular/forms';
import {
    MatDialog,
    MatDialogRef,
    MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatTableDataSource } from '@angular/material/table';

import { ApiService } from 'src/app/core/services/api.service';
import { Piece } from 'src/app/core/models/piece';
import { Event } from 'src/app/core/models/event';

import { MaterialModule } from '@modules/material.module';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { LookupPiece } from '@core/models/lookup-piece';
import { PieceDialogComponent } from '../../literature/piece-dialog/piece-dialog.component';
import { ProgramService } from '@core/services/program.service';
import { Program } from '@core/models/program';

@Component({
    selector: 'app-event-dialog',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MaterialModule,
        MatAutocompleteModule,
    ],
    providers: [],
    templateUrl: './event-dialog.component.html',
    styleUrls: ['./event-dialog.component.scss'],
})
export class EventDialogComponent implements OnInit {
    eventForm: FormGroup;
    pieceCtrl = new FormControl<string | LookupPiece>(''); // Verwenden Sie das neue Interface
    filteredPieces$!: Observable<LookupPiece[]>;
    allRepertoirePieces: LookupPiece[] = [];
    selectedPieces: LookupPiece[] = [];
    selectedPiecesDataSource = new MatTableDataSource<LookupPiece>();
    pieceColumns: string[] = ['reference', 'title', 'actions'];

    isEditMode = false;
    readOnly = false;
    private editEventId: number | null = null;
    programs: Program[] = [];

    @ViewChild('pieceInput') pieceInput!: ElementRef<HTMLInputElement>;

    constructor(
        private fb: FormBuilder,
        private apiService: ApiService,
        private programService: ProgramService,
        private dialog: MatDialog,
        public dialogRef: MatDialogRef<EventDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { event?: Event; readOnly?: boolean } | null
    ) {
        this.eventForm = this.fb.group({
            date: [new Date().toISOString().split('T')[0], Validators.required],
            type: ['', Validators.required],
            notes: [''],
            programId: [null as string | null],
        });

        if (data && data.event) {
            this.isEditMode = true;
            this.editEventId = data.event.id;
        }
        if (data && data.readOnly) {
            this.readOnly = true;
        }
    }

    ngOnInit(): void {
        if (this.readOnly) {
            // Read-only mode: populate from event data without API calls
            if (this.data?.event) {
                this.populateFromEvent(this.data.event);
                if (this.data.event.program) {
                    this.programs = [this.data.event.program as any];
                }
            }
            this.eventForm.disable();
            return;
        }

        // Holen Sie das gesamte Repertoire des Chors
        this.apiService.getRepertoireForLookup().subscribe((pieces) => {
            this.allRepertoirePieces = pieces;
            this.initializeAutocomplete();

            if (this.isEditMode && this.data?.event) {
                this.populateFromEvent(this.data.event);
            } else {
                // ensure table is initialized
                this.selectedPiecesDataSource.data = this.selectedPieces;
            }
        });

        this.programService.getPrograms().subscribe((programs) => {
            this.programs = (programs || []).filter(p => p.status !== 'archived');
        });
    }

    /*
     * This helper was used for formatting collection references but the current
     * lookup endpoint no longer provides that data. Commented out until a new
     * implementation is required.
     *
     * private formatReference(piece: Piece): string | undefined {
     *   return undefined;
     * }
     */

    private initializeAutocomplete(): void {
        this.filteredPieces$ = this.pieceCtrl.valueChanges.pipe(
            startWith(''),
            map((value) => {
                const searchString =
                    typeof value === 'string' ? value : value?.title;
                return searchString
                    ? this._filter(searchString)
                    : this.allRepertoirePieces.slice();
            })
        );
    }

    // --- DIE ERWEITERTE FILTERFUNKTION ---
    private _filter(search: string): LookupPiece[] {
        const filterValue = search.toLowerCase();
        const filterValueNoSpace = filterValue.replace(/\s/g, '');
        const selectedIds = new Set(this.selectedPieces.map((p) => p.id));

        return this.allRepertoirePieces.filter((piece) => {
            const isNotSelected = !selectedIds.has(piece.id);

            // Prüfen, ob der Titel ODER die Referenz passt.
            const titleMatches = piece.title
                .toLowerCase()
                .includes(filterValue);
            // 'piece.reference' ist jetzt ein einfacher String.
            const referenceMatches = piece.reference
                ? piece.reference
                      .toLowerCase()
                      .replace(/\s/g, '')
                      .includes(filterValueNoSpace)
                : false;

            return isNotSelected && (titleMatches || referenceMatches);
        });
    }

    // Helper, um den Titel im Input-Feld anzuzeigen
    displayPiece(piece: LookupPiece): string {
        return piece && piece.title ? piece.title : '';
    }

    // Wird aufgerufen, wenn ein Stück aus der Liste ausgewählt wird
    selected(event: MatAutocompleteSelectedEvent): void {
        const pieceToAdd = event.option.value as LookupPiece;
        if (pieceToAdd) {
            this.selectedPieces = [...this.selectedPieces, pieceToAdd];
            this.selectedPiecesDataSource.data = this.selectedPieces;
        }
        this.pieceInput.nativeElement.value = '';
        this.pieceCtrl.setValue('');
    }

    // Wird aufgerufen, wenn ein Stück aus der Liste entfernt wird
    remove(piece: LookupPiece): void {
        const index = this.selectedPieces.indexOf(piece);
        if (index >= 0) {
            this.selectedPieces = this.selectedPieces.filter(
                (p) => p !== piece
            );
            this.selectedPiecesDataSource.data = this.selectedPieces;
        }
        // Triggern Sie die Neubewertung der Autocomplete-Liste
        this.pieceCtrl.updateValueAndValidity();
    }

    openAddPieceDialog(): void {
        const dialogRef = this.dialog.open(PieceDialogComponent, {
            width: '90vw',
            maxWidth: '1000px',
            data: { pieceId: null },
        });

        dialogRef
            .afterClosed()
            .subscribe((newPiece: Piece | boolean | undefined) => {
                if (newPiece && typeof newPiece !== 'boolean') {
                    const lookup: LookupPiece = {
                        id: newPiece.id,
                        title: newPiece.title,
                        composerName: newPiece.composer?.name || newPiece.origin || '',
                        reference:
                            newPiece.collections &&
                            newPiece.collections.length > 0
                                ? `${newPiece.collections[0].singleEdition
                                      ? newPiece.composer?.name || newPiece.origin || ''
                                      : newPiece.collections[0].prefix || ''}${
                                      newPiece.collections[0].collection_piece
                                          .numberInCollection
                                  }`
                                : null,
                        collectionTitle:
                            newPiece.collections &&
                            newPiece.collections.length > 0
                                ? newPiece.collections[0].title || null
                                : null,
                    };
                    this.allRepertoirePieces.push(lookup);
                    this.selectedPieces = [...this.selectedPieces, lookup];
                    this.selectedPiecesDataSource.data = this.selectedPieces;
                    this.pieceCtrl.setValue('');
                }
            });
    }

    private populateFromEvent(event: Event): void {
        this.eventForm.patchValue({
            date: event.date ? event.date.toString().split('T')[0] : '',
            type: event.type,
            notes: event.notes || '',
            programId: event.program?.id || null,
        });

        this.selectedPieces = event.pieces.map((p) => ({
            id: p.id,
            title: p.title,
            composerName: p.composer?.name || p.origin || '',
            reference:
                p.collections && p.collections.length > 0
                    ? `${p.collections[0].singleEdition
                          ? p.composer?.name || p.origin || ''
                          : p.collections[0].prefix || ''}${
                          (p as any).collections[0].collection_piece
                              .numberInCollection
                      }`
                    : '',
            collectionTitle:
                p.collections && p.collections.length > 0
                    ? p.collections[0].title || null
                    : null,
        }));
        this.selectedPiecesDataSource.data = this.selectedPieces;
    }

    onCancel(): void {
        this.dialogRef.close();
    }

    onSave(): void {
        if (this.eventForm.valid) {
            const formValue = this.eventForm.value;
            const dateStr = formValue.date || undefined;
            const payload = {
                ...formValue,
                date: dateStr,
                pieceIds: this.selectedPieces.map((p) => p.id), // Senden Sie nur die IDs
            };
            if (this.isEditMode && this.editEventId) {
                this.dialogRef.close({ id: this.editEventId, ...payload });
            } else {
                this.dialogRef.close(payload);
            }
        }
    }
}
