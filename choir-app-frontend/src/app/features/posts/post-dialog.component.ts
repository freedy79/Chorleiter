import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { Post } from '@core/models/post';
import { MarkdownPipe } from '@shared/pipes/markdown.pipe';
import { ProgramPieceDialogComponent } from '../program/program-piece-dialog.component';
import { ApiService } from '@core/services/api.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize } from 'rxjs/operators';

type PostDialogAction = 'created' | 'updated';

type PostFormValue = {
  title: string;
  text: string;
  expiresAt: Date | null;
  sendTest: boolean;
  sendAsUser: boolean;
};

@Component({
  selector: 'app-post-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MaterialModule, MarkdownPipe],
  templateUrl: './post-dialog.component.html'
})
export class PostDialogComponent {
  form: FormGroup;
  isEdit = false;
  saving = false;
  private placeholderStart: number | null = null;
  constructor(
    private fb: FormBuilder,
    private dialog: MatDialog,
    private api: ApiService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<PostDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { post?: Post } | null,
  ) {
    this.form = this.fb.group({
      title: ['', Validators.required],
      text: ['', Validators.required],
      expiresAt: [null],
      sendTest: [false],
      sendAsUser: [false]
    });
    if (data?.post) {
      this.isEdit = true;
      this.form.patchValue({ title: data.post.title, text: data.post.text, expiresAt: data.post.expiresAt ? new Date(data.post.expiresAt) : null, sendAsUser: data.post.sendAsUser });
    }
  }

  onTextKeyDown(event: KeyboardEvent): void {
    if (event.key === '{') {
      const textarea = event.target as HTMLTextAreaElement;
      const pos = textarea.selectionStart || 0;
      if (textarea.value[pos - 1] === '{') {
        event.preventDefault();
        const before = textarea.value.slice(0, pos - 1);
        const after = textarea.value.slice(pos);
        this.placeholderStart = before.length;
        textarea.value = before + '{{}}' + after;
        textarea.selectionStart = textarea.selectionEnd = this.placeholderStart + 2;
        this.form.get('text')!.setValue(textarea.value);
        const ref = this.dialog.open(ProgramPieceDialogComponent, { width: '600px' });
        ref.afterClosed().subscribe(result => {
          const ctrl = this.form.get('text')!;
          const value = ctrl.value as string;
          if (result?.pieceId) {
            const before = value.slice(0, this.placeholderStart! + 2);
            const after = value.slice(this.placeholderStart! + 2);
            ctrl.setValue(before + result.pieceId + after);
            setTimeout(() => {
              textarea.focus();
              const cursor = this.placeholderStart! + 2 + String(result.pieceId).length;
              textarea.selectionStart = textarea.selectionEnd = cursor;
            });
          } else {
            const before = value.slice(0, this.placeholderStart!);
            const after = value.slice(this.placeholderStart! + 4);
            ctrl.setValue(before + after);
            setTimeout(() => {
              textarea.focus();
              textarea.selectionStart = textarea.selectionEnd = before.length;
            });
          }
          this.placeholderStart = null;
        });
      }
    }
  }

  save(): void {
    if (this.form.invalid || this.saving) {
      return;
    }
    const value = this.form.getRawValue() as PostFormValue;
    const expiresAt = value.expiresAt ? value.expiresAt.toISOString() : null;
    const payload = {
      title: value.title,
      text: value.text,
      expiresAt,
      sendTest: value.sendTest,
      sendAsUser: value.sendAsUser
    };
    const request$ = this.isEdit && this.data?.post
      ? this.api.updatePost(this.data.post.id, payload)
      : this.api.createPost(payload);
    const action: PostDialogAction = this.isEdit ? 'updated' : 'created';
    const errorMessage = this.isEdit ? 'Fehler beim Aktualisieren' : 'Fehler beim Speichern';
    this.saving = true;
    this.dialogRef.disableClose = true;
    request$
      .pipe(finalize(() => {
        this.saving = false;
        this.dialogRef.disableClose = false;
      }))
      .subscribe({
        next: () => {
          this.dialogRef.close(action);
        },
        error: () => {
          this.snackBar.open(errorMessage, 'Schließen', { duration: 4000 });
        }
      });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
