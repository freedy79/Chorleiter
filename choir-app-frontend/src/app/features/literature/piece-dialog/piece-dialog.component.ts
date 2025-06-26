import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
    ReactiveFormsModule,
    FormBuilder,
    FormGroup,
    Validators,
    FormArray,
} from '@angular/forms';
import {
    MAT_DIALOG_DATA,
    MatDialog,
    MatDialogRef,
} from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { Composer } from '@core/models/composer';
import { BehaviorSubject, Observable, switchMap } from 'rxjs';
import { ApiService } from '@core/services/api.service';
import { ComposerDialogComponent } from '../../composers/composer-dialog/composer-dialog.component';
import { Category } from '@core/models/category';
import { CategoryDialogComponent } from '../../categories/category-dialog/category-dialog.component';
import { Author } from '@core/models/author';
import { Piece } from '@core/models/piece';

@Component({
    selector: 'app-piece-dialog',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, MaterialModule],
    templateUrl: './piece-dialog.component.html',
    styleUrls: ['./piece-dialog.component.scss'],
})
export class PieceDialogComponent implements OnInit {
    pieceForm: FormGroup;
    private refreshComposers$ = new BehaviorSubject<void>(undefined);
    private refreshAuthors$ = new BehaviorSubject<void>(undefined);
    private refreshCategory$ = new BehaviorSubject<void>(undefined);
    public composers$!: Observable<Composer[]>;
    public authors$!: Observable<Author[]>;
    public categories$!: Observable<Category[]>;
    isEditMode = false;

    get linksFormArray(): FormArray {
        return this.pieceForm.get('links') as FormArray;
    }

    readonly addNewComposerId = -1;
    readonly addNewAuthorId = -1;
    readonly addNewId = -1;

    // We inject MatDialogRef to control the dialog (e.g., close it)
    constructor(
        private fb: FormBuilder,
        private apiService: ApiService,
        public dialog: MatDialog,
        public dialogRef: MatDialogRef<PieceDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { pieceId: number | null }
    ) {
        this.isEditMode = !!data.pieceId;

        this.pieceForm = this.fb.group({
            title: ['', Validators.required],

            voicing: [''],

            lyrics: [''],
            links: this.fb.array([]),
            opus: [''],
            key: [''],
            license: [''],
            composerId: [null, Validators.required],
            authorId: [null, Validators.required],
            categoryId: [null],
        });
    }

    ngOnInit(): void {
        this.composers$ = this.refreshComposers$.pipe(
            switchMap(() => this.apiService.getComposers())
        );

        this.authors$ = this.refreshAuthors$.pipe(
            switchMap(() => this.apiService.getAuthors())
        );

        // Listen for changes on the composerId dropdown
        this.pieceForm.get('composerId')?.valueChanges.subscribe((value) => {
            if (value === this.addNewComposerId) {
                this.openAddComposerDialog();
            }
        });

        this.pieceForm.get('authorId')?.valueChanges.subscribe((value) => {
            if (value === this.addNewAuthorId) {
                this.openAddComposerDialog();
            }
        });

        this.categories$ = this.refreshComposers$.pipe(
            switchMap(() => this.apiService.getCategories())
        );

        this.pieceForm.get('categoryId')?.valueChanges.subscribe((value) => {
            if (value === this.addNewId) this.openAddCategoryDialog();
        });

        if (this.isEditMode && this.data.pieceId) {
            this.apiService
                .getPieceById(this.data.pieceId)
                .subscribe((piece) => {
                    this.populateForm(piece);
                });
        }
    }

    openAddComposerDialog(): void {
        const composerDialogRef = this.dialog.open(ComposerDialogComponent, {
            width: '500px',
        });

        composerDialogRef.afterClosed().subscribe((newComposerName) => {
            if (newComposerName) {
                // If a new name was saved, create it via the API
                this.apiService
                    .createComposer(newComposerName)
                    .subscribe((newComposer) => {
                        // Trigger the composer list to refresh
                        this.refreshComposers$.next();
                        // Pre-select the newly created composer in the form
                        this.pieceForm
                            .get('composerId')
                            ?.setValue(newComposer.id);
                    });
            } else {
                // If the user cancelled, reset the dropdown to its previous state
                this.pieceForm.get('composerId')?.setValue(null);
            }
        });
    }

    openAddCategoryDialog(): void {
        const dialogRef = this.dialog.open(CategoryDialogComponent, {
            width: '400px',
        });
        dialogRef.afterClosed().subscribe((newCategoryName) => {
            if (newCategoryName) {
                this.apiService
                    .createCategory(newCategoryName)
                    .subscribe((newCategory) => {
                        this.refreshCategory$.next();
                        this.pieceForm
                            .get('categoryId')
                            ?.setValue(newCategory.id);
                    });
            } else {
                this.pieceForm.get('categoryId')?.setValue(null);
            }
        });
    }

    addLink(): void {
        const linkFormGroup = this.fb.group({
            description: ['', Validators.required],
            url: ['', Validators.required],
            type: ['EXTERNAL', Validators.required],
        });
        this.linksFormArray.push(linkFormGroup);
    }

    removeLink(index: number): void {
        this.linksFormArray.removeAt(index);
    }

    populateForm(piece: Piece): void {
        this.pieceForm.patchValue({
            title: piece.title,
            opus: piece.opus,
            voicing: piece.voicing,
            key: piece.key,
            timeSignature: piece.timeSignature,
            license: piece.license,
            composerId: piece.composer?.id,
            authorId: piece.author?.id,
            categoryId: piece.category?.id,
            arrangerIds: piece.arrangers?.map((a) => a.id) || [],
            lyrics: piece.lyrics,
        });

        // Populate the links FormArray
        piece.links?.forEach((link) => {
            this.linksFormArray.push(
                this.fb.group({
                    description: [link.description, Validators.required],
                    url: [link.url, Validators.required],
                    type: [link.type, Validators.required],
                })
            );
        });
    }

    onCancel(): void {
        // Close the dialog without sending any data back
        this.dialogRef.close();
    }

    onSave(): void {
        if (this.pieceForm.valid) {
            // Step 1: Create the global piece
            this.apiService
                .createGlobalPiece(this.pieceForm.value)
                .pipe(
                    // Step 2: Use the new piece's ID to add it to the choir's repertoire
                    switchMap((newlyCreatedPiece) =>
                        this.apiService.addPieceToMyRepertoire(
                            newlyCreatedPiece.id
                        )
                    )
                )
                .subscribe({
                    next: () => {
                        // Success! Close the dialog and return true.
                        this.dialogRef.close(true);
                    },
                    error: (err) => {
                        console.error('Failed to create and add piece', err);
                        // Show error to user...
                    },
                });
        }
    }
}
