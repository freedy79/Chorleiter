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
    ValidationErrors,
    FormControl,
} from '@angular/forms';
import {
    MAT_DIALOG_DATA,
    MatDialog,
    MatDialogRef,
} from '@angular/material/dialog';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MaterialModule } from '@modules/material.module';
import { Composer } from '@core/models/composer';
import { BehaviorSubject, Observable, switchMap, map, of, startWith, forkJoin } from 'rxjs';
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

export function composerOrOriginValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const composerId = control.get('composerId')?.value;
        const origin = control.get('origin')?.value;
        return !composerId && !origin ? { composerOrOriginRequired: true } : null;
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
    public categories$!: Observable<Category[]>;
    isEditMode = false;
    isAdmin = false;
    activeSection: 'general' | 'opus' | 'text' | 'files' = 'general';
    imagePreview: string | null = null;
    imageFile: File | null = null;
    isDragOver = false;
    removedLinkPaths: string[] = [];

    composerCtrl = new FormControl<string | Composer>('');
    filteredComposers$!: Observable<(Composer & { isNew?: boolean })[]>;
    allComposers: Composer[] = [];
    authorCtrl = new FormControl<string | Author>('');
    filteredAuthors$!: Observable<(Author & { isNew?: boolean })[]>;
    allAuthors: Author[] = [];

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
        @Inject(MAT_DIALOG_DATA) public data: { pieceId?: number | null; initialTitle?: string }
    ) {
        this.isEditMode = !!data.pieceId;

        this.pieceForm = this.fb.group({
            title: ['', Validators.required],
            subtitle: [''],
            composerCollection: [''],
            voicing: [''],
            lyrics: [''],
            lyricsSource: [''],
            links: this.fb.array([]),
            opus: [''],
            key: [''],
            timeSignature: [''],
            license: [''],
            composerId: [null],
            origin: [''],
            authorId: [null],
            categoryId: [null],
        }, { validators: [authorOrSourceValidator(), composerOrOriginValidator()] });

        if (!this.isEditMode && data.initialTitle) {
            this.pieceForm.get('title')?.setValue(data.initialTitle);
        }
    }

    ngOnInit(): void {
        this.authService.isAdmin$.subscribe(v => this.isAdmin = v);
        this.refreshComposers$
            .pipe(switchMap(() => this.apiService.getComposers()))
            .subscribe(list => {
                this.allComposers = list;
                this.initializeComposerAutocomplete();
                const composerId = this.pieceForm.get('composerId')?.value;
                if (composerId && !this.composerCtrl.value) {
                    const found = this.allComposers.find(c => c.id === composerId);
                    if (found) this.composerCtrl.setValue(found);
                }
            });

        this.refreshAuthors$
            .pipe(switchMap(() => this.apiService.getAuthors()))
            .subscribe(list => {
                this.allAuthors = list;
                this.initializeAuthorAutocomplete();
                const authorId = this.pieceForm.get('authorId')?.value;
                if (authorId && !this.authorCtrl.value) {
                    const found = this.allAuthors.find(a => a.id === authorId);
                    if (found) this.authorCtrl.setValue(found);
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

    openAddComposerDialog(name?: string): void {
        const composerDialogRef = this.dialog.open(ComposerDialogComponent, {
            width: '500px',
            data: { role: 'composer', record: name ? { name } : undefined }
        });

        composerDialogRef.afterClosed().subscribe((newComposer) => {
            if (newComposer) {
                this.apiService
                    .createComposer(newComposer)
                    .subscribe({
                        next: (created) => {
                            this.refreshComposers$.next();
                            this.allComposers.push(created);
                            this.composerCtrl.setValue(created);
                            this.pieceForm.get('composerId')?.setValue(created.id);
                        },
                        error: err => {
                            if (err.status === 409 && confirm('Komponist existiert bereits. Trotzdem anlegen?')) {
                                this.apiService.createComposer(newComposer, true).subscribe(created => {
                                    this.refreshComposers$.next();
                                    this.allComposers.push(created);
                                    this.composerCtrl.setValue(created);
                                    this.pieceForm.get('composerId')?.setValue(created.id);
                                });
                            }
                        }
                    });
            } else {
                this.pieceForm.get('composerId')?.setValue(null);
                this.composerCtrl.setValue('');
            }
        });
    }

    openAddAuthorDialog(name?: string): void {
        const dialogRef = this.dialog.open(ComposerDialogComponent, {
            width: '500px',
            data: { role: 'author', record: name ? { name } : undefined }
        });

        dialogRef.afterClosed().subscribe((newAuthor) => {
            if (newAuthor) {
                this.apiService
                    .createAuthor(newAuthor)
                    .subscribe({
                        next: (created) => {
                            this.refreshAuthors$.next();
                            this.pieceForm
                                .get('authorId')
                                ?.setValue(created.id);
                        },
                        error: err => {
                            if (err.status === 409 && confirm('Dichter existiert bereits. Trotzdem anlegen?')) {
                                this.apiService.createAuthor(newAuthor, true).subscribe(created => {
                                    this.refreshAuthors$.next();
                                    this.pieceForm.get('authorId')?.setValue(created.id);
                                });
                            }
                        }
                    });
            } else {
                this.pieceForm.get('authorId')?.setValue(null);
                this.authorCtrl.setValue('');
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
            downloadName: [''],
        });
        this.linksFormArray.push(linkFormGroup);
    }

    removeLink(index: number): void {
        const linkGroup = this.linksFormArray.at(index) as FormGroup;
        const type = linkGroup.get('type')?.value;
        const url = linkGroup.get('url')?.value;
        if (type === 'FILE_DOWNLOAD' && url) {
            this.removedLinkPaths.push(url);
        }
        this.linksFormArray.removeAt(index);
    }

    onLinkFileSelected(event: Event, index: number): void {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;
        const linkGroup = this.linksFormArray.at(index) as FormGroup;
        this.pieceService.uploadPieceLinkFile(file).subscribe(res => {
            linkGroup.get('url')?.setValue(res.path);
            linkGroup.get('description')?.setValue(file.name);
            linkGroup.get('downloadName')?.setValue(file.name);
        });
    }

    onLinkTypeChange(index: number): void {
        const linkGroup = this.linksFormArray.at(index) as FormGroup;
        const prevUrl = linkGroup.get('url')?.value;
        const newType = linkGroup.get('type')?.value;
        if (newType !== 'FILE_DOWNLOAD' && prevUrl) {
            this.removedLinkPaths.push(prevUrl);
        }
        linkGroup.get('url')?.setValue('');
        linkGroup.get('downloadName')?.setValue('');
    }

    private initializeComposerAutocomplete(): void {
        this.filteredComposers$ = this.composerCtrl.valueChanges.pipe(
            startWith(''),
            map(value => (typeof value === 'string' ? value : value?.name || '')),
            map(name => {
                const filtered = this._filterComposers(name);
                const options = filtered.map(c => ({ ...c }));
                if (name && !filtered.some(c => c.name.toLowerCase() === name.toLowerCase())) {
                    options.unshift({ id: this.addNewComposerId, name, isNew: true } as Composer & { isNew: boolean });
                }
                return options;
            })
        );
    }

    private initializeAuthorAutocomplete(): void {
        this.filteredAuthors$ = this.authorCtrl.valueChanges.pipe(
            startWith(''),
            map(value => (typeof value === 'string' ? value : value?.name || '')),
            map(name => {
                const filtered = this._filterAuthors(name);
                const options = filtered.map(a => ({ ...a }));
                if (name && !filtered.some(a => a.name.toLowerCase() === name.toLowerCase())) {
                    options.unshift({ id: this.addNewAuthorId, name, isNew: true } as Author & { isNew: boolean });
                }
                return options;
            })
        );
    }

    private _filterComposers(search: string): Composer[] {
        const filterValue = search.toLowerCase();
        return this.allComposers.filter(c => c.name.toLowerCase().includes(filterValue));
    }

    private _filterAuthors(search: string): Author[] {
        const filterValue = search.toLowerCase();
        return this.allAuthors.filter(a => a.name.toLowerCase().includes(filterValue));
    }

    displayComposer(composer: Composer & { isNew?: boolean }): string {
        return composer ? composer.name : '';
    }

    onComposerSelected(event: MatAutocompleteSelectedEvent): void {
        const selected = event.option.value as Composer & { isNew?: boolean };
        if (selected.isNew) {
            this.openAddComposerDialog(selected.name);
        } else {
            this.pieceForm.get('composerId')?.setValue(selected.id);
            this.composerCtrl.setValue(selected);
        }
    }

    displayAuthor(author: Author & { isNew?: boolean }): string {
        return author ? author.name : '';
    }

    onAuthorSelected(event: MatAutocompleteSelectedEvent): void {
        const selected = event.option.value as Author & { isNew?: boolean };
        if (selected.isNew) {
            this.openAddAuthorDialog(selected.name);
        } else {
            this.pieceForm.get('authorId')?.setValue(selected.id);
            this.authorCtrl.setValue(selected);
        }
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
            this.pieceForm.hasError('composerOrOriginRequired') ||
            false
        );
    }

    isFilesStepInvalid(): boolean {
        return this.linksFormArray.invalid;
    }

    populateForm(piece: Piece): void {
        this.pieceForm.patchValue({
            title: piece.title,
            subtitle: piece.subtitle,
            composerCollection: piece.composerCollection,
            opus: piece.opus,
            voicing: piece.voicing,
            key: piece.key,
            timeSignature: piece.timeSignature,
            license: piece.license,
            composerId: piece.composer?.id,
            origin: piece.origin,
            authorId: piece.author?.id,
            categoryId: piece.category?.id,
            arrangerIds: piece.arrangers?.map((a) => a.id) || [],
            lyrics: piece.lyrics,
            lyricsSource: piece.lyricsSource,
        });

        if (piece.composer) {
            const found = this.allComposers.find(c => c.id === piece.composer!.id);
            this.composerCtrl.setValue(found || piece.composer);
        }

        if (piece.author) {
            const foundAuthor = this.allAuthors.find(a => a.id === piece.author!.id);
            if (foundAuthor) this.authorCtrl.setValue(foundAuthor);
        }

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
                    downloadName: [link.downloadName || ''],
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
                    ),
                    switchMap(() =>
                        this.removedLinkPaths.length && this.isAdmin
                            ? forkJoin(this.removedLinkPaths.map(p => this.pieceService.deletePieceLinkFile(p)))
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
                    ),
                    switchMap((createdPiece) =>
                        this.removedLinkPaths.length
                            ? forkJoin(this.removedLinkPaths.map(p => this.pieceService.deletePieceLinkFile(p))).pipe(map(() => createdPiece))
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
