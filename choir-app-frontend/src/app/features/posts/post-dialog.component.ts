import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { Post } from '@core/models/post';
import { MarkdownPipe } from '@shared/pipes/markdown.pipe';
import { ProgramPieceDialogComponent } from '../program/program-piece-dialog.component';
import { ApiService } from '@core/services/api.service';
import { NotificationService } from '@core/services/notification.service';
import { finalize, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

type PostDialogAction = 'created' | 'updated';

type PostFormValue = {
  title: string;
  text: string;
  expiresAt: Date | null;
  sendTest: boolean;
  sendAsUser: boolean;
  enablePoll: boolean;
  pollAllowMultiple: boolean;
  pollMaxSelections: number;
  pollClosesAt: Date | null;
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
  selectedFile: File | null = null;
  existingAttachment: string | null = null;
  removeExistingAttachment = false;
  private placeholderStart: number | null = null;
  constructor(
    private fb: FormBuilder,
    private dialog: MatDialog,
    private api: ApiService,
    private notification: NotificationService,
    public dialogRef: MatDialogRef<PostDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { post?: Post } | null,
  ) {
    this.form = this.fb.group({
      title: ['', Validators.required],
      text: ['', Validators.required],
      expiresAt: [null],
      sendTest: [false],
      sendAsUser: [false],
      enablePoll: [false],
      pollAllowMultiple: [false],
      pollMaxSelections: [1, [Validators.min(1)]],
      pollClosesAt: [null],
      pollOptions: this.fb.array<FormControl<string | null>>([
        this.fb.control<string>(''),
        this.fb.control<string>('')
      ])
    });
    if (data?.post) {
      this.isEdit = true;
      this.existingAttachment = data.post.attachmentOriginalName || null;
      this.form.patchValue({
        title: data.post.title,
        text: data.post.text,
        expiresAt: data.post.expiresAt ? new Date(data.post.expiresAt) : null,
        sendAsUser: data.post.sendAsUser
      });
      if (data.post.poll) {
        this.form.patchValue({
          enablePoll: true,
          pollAllowMultiple: data.post.poll.allowMultiple,
          pollMaxSelections: data.post.poll.maxSelections,
          pollClosesAt: data.post.poll.closesAt ? new Date(data.post.poll.closesAt) : null
        });
        this.pollOptions.clear();
        data.post.poll.options
          .sort((a, b) => a.position - b.position)
          .forEach(option => this.pollOptions.push(this.fb.control<string>(option.label)));
      }
    }
  }

  get pollOptions(): FormArray<FormControl<string | null>> {
    return this.form.get('pollOptions') as FormArray<FormControl<string | null>>;
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

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.selectedFile = input.files[0];
      this.removeExistingAttachment = false;
    }
  }

  clearSelectedFile(): void {
    this.selectedFile = null;
  }

  markRemoveAttachment(): void {
    this.removeExistingAttachment = true;
    this.existingAttachment = null;
    this.selectedFile = null;
  }

  save(): void {
    if (this.form.invalid || this.saving) {
      return;
    }
    const value = this.form.getRawValue() as PostFormValue;
    const expiresAt = value.expiresAt ? value.expiresAt.toISOString() : null;
    const pollPayload = this.buildPollPayload();
    if (pollPayload === false) {
      return;
    }
    const payload = {
      title: value.title,
      text: value.text,
      expiresAt,
      sendTest: value.sendTest,
      sendAsUser: value.sendAsUser,
      poll: pollPayload
    };
    const request$ = this.isEdit && this.data?.post
      ? this.api.updatePost(this.data.post.id, payload)
      : this.api.createPost(payload);
    const action: PostDialogAction = this.isEdit ? 'updated' : 'created';
    const errorMessage = this.isEdit ? 'Fehler beim Aktualisieren' : 'Fehler beim Speichern';
    this.saving = true;
    this.dialogRef.disableClose = true;
    request$
      .pipe(
        switchMap(post => {
          if (this.removeExistingAttachment && !this.selectedFile) {
            return this.api.removePostAttachment(post.id);
          }
          if (this.selectedFile) {
            return this.api.uploadPostAttachment(post.id, this.selectedFile);
          }
          return of(post);
        }),
        finalize(() => {
          this.saving = false;
          this.dialogRef.disableClose = false;
        })
      )
      .subscribe({
        next: () => {
          this.dialogRef.close(action);
        },
        error: () => {
          this.notification.error(errorMessage);
        }
      });
  }

  cancel(): void {
    this.dialogRef.close();
  }

  addPollOption(): void {
    this.pollOptions.push(this.fb.control<string>(''));
  }

  removePollOption(index: number): void {
    if (this.pollOptions.length <= 2) {
      return;
    }
    this.pollOptions.removeAt(index);
  }

  dropPollOption(event: CdkDragDrop<FormControl<string | null>[]>): void {
    moveItemInArray(this.pollOptions.controls, event.previousIndex, event.currentIndex);
  }

  toggleAllowMultiple(checked: boolean): void {
    if (!checked) {
      this.form.patchValue({ pollMaxSelections: 1 });
    } else if ((this.form.get('pollMaxSelections')?.value || 1) < 1) {
      this.form.patchValue({ pollMaxSelections: Math.max(1, this.pollOptions.length) });
    }
  }

  private buildPollPayload(): { options: string[]; allowMultiple: boolean; maxSelections: number; closesAt: string | null } | null | false {
    if (!this.form.get('enablePoll')?.value) {
      return null;
    }
    const options = this.pollOptions.controls
      .map(ctrl => (ctrl.value || '').trim())
      .filter(Boolean);
    if (options.length < 2) {
      this.notification.error('Bitte mindestens zwei Optionen angeben.');
      return false;
    }
    const allowMultiple = !!this.form.get('pollAllowMultiple')?.value;
    let maxSelections = allowMultiple ? Number(this.form.get('pollMaxSelections')?.value || 1) : 1;
    if (Number.isNaN(maxSelections) || maxSelections < 1) {
      this.notification.error('Bitte eine gültige Stimmenanzahl angeben.');
      return false;
    }
    maxSelections = Math.min(maxSelections, options.length);
    const closes = this.form.get('pollClosesAt')?.value as Date | null;
    return {
      options,
      allowMultiple,
      maxSelections,
      closesAt: closes ? closes.toISOString() : null
    };
  }
}
