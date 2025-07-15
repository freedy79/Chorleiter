import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
    ReactiveFormsModule,
    FormBuilder,
    FormGroup,
    Validators,
    FormArray,
    ValidatorFn,
    AbstractControl,
    ValidationErrors
} from '@angular/forms';
import {
    MAT_DIALOG_DATA,
    MatDialog,
    MatDialogRef,
} from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { Composer } from '@core/models/composer';
import { BehaviorSubject, Observable, switchMap, map, of } from 'rxjs';
import { ApiService } from '@core/services/api.service';
import { PieceService } from '@core/services/piece.service';
import { ComposerDialogComponent } from '../../composers/composer-dialog/composer-dialog.component';
import { Category } from '@core/models/category';
import { CategoryDialogComponent } from '../../categories/category-dialog/category-dialog.component';
import { Author } from '@core/models/author';
import { Piece } from '@core/models/piece';
import { AuthService } from '@core/services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';

export function authorOrSourceValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const authorId = control.get('authorId')?.value;
        const source = control.get('lyricsSource')?.value;
        return !authorId && !source ? { authorOrSourceRequired: true } : null;
    };
}

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
    isAdmin = false;
    activeSection: 'general' | 'text' | 'files' = 'general';
    imagePreview: string | null = null;
    imageFile: File | null = null;
    isDragOver = false;

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
        private pieceService: PieceService,
        private authService: AuthService,
        private snackBar: MatSnackBar,
        public dialog: MatDialog,
        public dialogRef: MatDialogRef<PieceDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { pieceId: number | null }
    ) {
        this.isEditMode = !!data.pieceId;

        this.pieceForm = this.fb.group({
            title: ['', Validators.required],
            voicing: [''],
            lyrics: [''],
            lyricsSource: [''],
            links: this.fb.array([]),
            opus: [''],
            key: [''],
            timeSignature: [''],
            license: [''],
            composerId: [null, Validators.required],
            authorId: [null],
            categoryId: [null],
        }, { validators: authorOrSourceValidator() });
    }

    ngOnInit(): void {
        this.authService.isAdmin$.subscribe(v => this.isAdmin = v);
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
                this.openAddAuthorDialog();
            }
        });

        this.categories$ = this.refreshComposers$.pipe(
            switchMap(() => this.apiService.getCategories())
        );

        this.pieceForm.get('categoryId')?.valueChanges.subscribe((value) => {
            if (value === this.addNewId) this.openAddCategoryDialog();
        });

        if (this.isEditMode && this.data.pieceId) {
            this.pieceService
                .getPieceById(this.data.pieceId)
                .subscribe((piece) => {
                    this.populateForm(piece);
                });
        }
    }

    openAddComposerDialog(): void {
        const composerDialogRef = this.dialog.open(ComposerDialogComponent, {
            width: '500px',
            data: { role: 'composer' }
        });

        composerDialogRef.afterClosed().subscribe((newComposer) => {
            if (newComposer) {
                this.apiService
                    .createComposer(newComposer)
                    .subscribe((created) => {
                        this.refreshComposers$.next();
                        this.pieceForm
                            .get('composerId')
                            ?.setValue(created.id);
                    });
            } else {
                this.pieceForm.get('composerId')?.setValue(null);
            }
        });
    }

    openAddAuthorDialog(): void {
        const dialogRef = this.dialog.open(ComposerDialogComponent, {
            width: '500px',
            data: { role: 'author' }
        });

        dialogRef.afterClosed().subscribe((newAuthor) => {
            if (newAuthor) {
                this.apiService
                    .createAuthor(newAuthor)
                    .subscribe((created) => {
                        this.refreshAuthors$.next();
                        this.pieceForm
                            .get('authorId')
                            ?.setValue(created.id);
                    });
            } else {
                this.pieceForm.get('authorId')?.setValue(null);
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
        this.imageFile = file;
        this.snackBar.open(
            'Es ist urheberrechtlich untersagt, ganze Notenseiten oder vollständige Stücke abzulegen, wenn das Notenbild nicht rechtefrei ist.',
            'Verstanden',
            { duration: 10000 }
        );
        const reader = new FileReader();
        reader.onload = () => (this.imagePreview = reader.result as string);
        reader.readAsDataURL(file);
    }

    isGeneralStepInvalid(): boolean {
        return (
            this.pieceForm.get('title')?.invalid ||
            this.pieceForm.get('composerId')?.invalid ||
            false
        );
    }

    isFilesStepInvalid(): boolean {
        return this.linksFormArray.invalid;
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
            lyricsSource: piece.lyricsSource,
        });

        if (piece.imageIdentifier) {
            this.pieceService.getPieceImage(piece.id).subscribe(data => this.imagePreview = data);
        }

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
        if (this.pieceForm.invalid) {
            return;
        }

        if (this.isEditMode && this.data.pieceId) {
            const obs = this.isAdmin
                ? this.pieceService.updateGlobalPiece(this.data.pieceId, this.pieceForm.value)
                : this.pieceService.proposePieceChange(this.data.pieceId, this.pieceForm.value);
            obs
                .pipe(
                    switchMap(() =>
                        this.imageFile && this.isAdmin
                            ? this.pieceService.uploadPieceImage(this.data.pieceId!, this.imageFile)
                            : of(null)
                    )
                )
                .subscribe({
                    next: () => this.dialogRef.close(true),
                    error: (err) => {
                        console.error('Failed to save piece', err);
                    },
                });
        } else {
            this.pieceService
                .createGlobalPiece(this.pieceForm.value)
                .pipe(
                    switchMap((newlyCreatedPiece) =>
                        this.pieceService
                            .addPieceToMyRepertoire(newlyCreatedPiece.id)
                            .pipe(map(() => newlyCreatedPiece))
                    ),
                    switchMap((createdPiece) =>
                        this.imageFile
                            ? this.pieceService.uploadPieceImage(createdPiece.id, this.imageFile).pipe(map(() => createdPiece))
                            : of(createdPiece)
                    )
                )
                .subscribe({
                    next: (createdPiece) => this.dialogRef.close(createdPiece),
                    error: (err) => {
                        console.error('Failed to create and add piece', err);
                    },
                });
        }
    }
}
