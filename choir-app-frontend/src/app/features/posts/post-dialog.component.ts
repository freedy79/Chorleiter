import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { Post } from '@core/models/post';
import { ApiService } from '@core/services/api.service';
import { LookupPiece } from '@core/models/lookup-piece';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { MarkdownPipe } from '@shared/pipes/markdown.pipe';

@Component({
  selector: 'app-post-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MaterialModule, MarkdownPipe],
  templateUrl: './post-dialog.component.html'
})
export class PostDialogComponent {
  form: FormGroup;
  isEdit = false;
  pieceCtrl = new FormControl<string | LookupPiece | null>('');
  filteredPieces$!: Observable<LookupPiece[]>;
  allPieces: LookupPiece[] = [];
  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<PostDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { post?: Post } | null,
    private api: ApiService
  ) {
    this.form = this.fb.group({
      title: ['', Validators.required],
      text: ['', Validators.required],
      pieceId: [null],
      expiresAt: [null]
    });
    if (data?.post) {
      this.isEdit = true;
      this.form.patchValue({ title: data.post.title, text: data.post.text, pieceId: data.post.piece?.id, expiresAt: data.post.expiresAt ? new Date(data.post.expiresAt) : null });
      if (data.post.piece) this.pieceCtrl.setValue({
        id: data.post.piece.id,
        title: data.post.piece.title,
        composerName: '',
        collectionTitle: null,
        reference: null
      });
    }

    this.api.getRepertoireForLookup().subscribe(pieces => {
      this.allPieces = pieces;
      this.filteredPieces$ = this.pieceCtrl.valueChanges.pipe(
        startWith(''),
        map(value => {
          const title = typeof value === 'string' ? value : value?.title;
          return title ? this._filter(title) : this.allPieces.slice();
        })
      );
    });
  }

  private _filter(value: string): LookupPiece[] {
    const filterValue = value.toLowerCase();
    return this.allPieces.filter(p => p.title.toLowerCase().includes(filterValue));
  }

  displayPiece(piece: LookupPiece): string {
    return piece && piece.title ? piece.title : '';
  }

  save(): void {
    if (this.form.valid) {
      const piece = this.pieceCtrl.value;
      const pieceId = piece && typeof piece === 'object' ? piece.id : null;
      const expiresAt = this.form.value.expiresAt ? this.form.value.expiresAt.toISOString() : null;
      this.dialogRef.close({ title: this.form.value.title, text: this.form.value.text, pieceId, expiresAt });
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
