import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { Post } from '@core/models/post';
import { PostImage } from '@core/models/post-image';
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
  expiresAt: string | null;
  sendTest: boolean;
  sendAsUser: boolean;
  enablePoll: boolean;
  pollAllowMultiple: boolean;
  pollMaxSelections: number;
  pollClosesAt: string | null;
  pollIsAnonymous: boolean;
};

const MAX_IMAGES = 5;

@Component({
  selector: 'app-post-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MaterialModule, MarkdownPipe],
  templateUrl: './post-dialog.component.html',
  styleUrls: ['./post-dialog.component.scss']
})
export class PostDialogComponent {
  form: FormGroup;
  isEdit = false;
  saving = false;
  showAttachmentSection = false;
  showPollSection = false;
  selectedFile: File | null = null;
  existingAttachment: string | null = null;
  removeExistingAttachment = false;
  private placeholderStart: number | null = null;

  // Image management
  uploadedImages: PostImage[] = [];
  imageUploading = false;
  readonly maxImages = MAX_IMAGES;
  private postId: number | null = null;
  private textareaRef: HTMLTextAreaElement | null = null;
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
      pollIsAnonymous: [true],
      pollOptions: this.fb.array<FormControl<string | null>>([
        this.fb.control<string>(''),
        this.fb.control<string>('')
      ])
    });
    if (data?.post) {
      this.isEdit = true;
      this.postId = data.post.id;
      this.existingAttachment = data.post.attachmentOriginalName || null;
      this.showAttachmentSection = !!this.existingAttachment;
      this.uploadedImages = (data.post.images || []).map(img => ({
        ...img,
        url: this.api.getPostImageUrl(data.post!.id, img.id)
      }));
      this.form.patchValue({
        title: data.post.title,
        text: data.post.text,
        expiresAt: data.post.expiresAt ? data.post.expiresAt.toString().split('T')[0] : null,
        sendAsUser: data.post.sendAsUser
      });
      if (data.post.poll) {
        this.showPollSection = true;
        this.form.patchValue({
          enablePoll: true,
          pollAllowMultiple: data.post.poll.allowMultiple,
          pollMaxSelections: data.post.poll.maxSelections,
          pollClosesAt: data.post.poll.closesAt ? data.post.poll.closesAt.toString().split('T')[0] : null,
          pollIsAnonymous: data.post.poll.isAnonymous !== false
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

  addAttachmentSection(): void {
    this.showAttachmentSection = true;
  }

  removeAttachmentSection(): void {
    if (this.existingAttachment) {
      this.markRemoveAttachment();
    } else {
      this.clearSelectedFile();
    }
    this.showAttachmentSection = false;
  }

  addPollSection(): void {
    this.showPollSection = true;
    this.form.patchValue({ enablePoll: true });
  }

  removePollSection(): void {
    this.showPollSection = false;
    this.form.patchValue({
      enablePoll: false,
      pollAllowMultiple: false,
      pollMaxSelections: 1,
      pollClosesAt: null,
      pollIsAnonymous: true
    });
    this.pollOptions.clear();
    this.pollOptions.push(this.fb.control<string>(''));
    this.pollOptions.push(this.fb.control<string>(''));
  }

  markRemoveAttachment(): void {
    this.removeExistingAttachment = true;
    this.existingAttachment = null;
    this.selectedFile = null;
  }

  // ── Image upload methods ──────────────────────────────────────────────

  onTextareaFocus(event: FocusEvent): void {
    this.textareaRef = event.target as HTMLTextAreaElement;
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    input.value = ''; // Allow re-selecting same file

    if (this.uploadedImages.length >= this.maxImages) {
      this.notification.warning(`Maximal ${this.maxImages} Bilder erlaubt.`);
      return;
    }

    if (!file.type.match(/^image\/(jpeg|png|gif|webp)$/)) {
      this.notification.error('Nur JPG, PNG, GIF oder WebP erlaubt.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      this.notification.error('Bild darf maximal 2 MB groß sein.');
      return;
    }

    // If editing an existing post, upload immediately
    if (this.postId) {
      this.uploadImageToPost(this.postId, file);
    } else {
      // For new posts: auto-save as draft first, then upload
      this.autoSaveAsDraft(file);
    }
  }

  private autoSaveAsDraft(pendingFile: File): void {
    const value = this.form.getRawValue() as PostFormValue;
    const payload = {
      title: value.title || 'Entwurf',
      text: value.text || ' ',
      expiresAt: value.expiresAt || null,
      sendAsUser: value.sendAsUser
    };
    this.imageUploading = true;
    this.api.createPost(payload).subscribe({
      next: (post) => {
        this.postId = post.id;
        this.isEdit = true;
        this.uploadImageToPost(post.id, pendingFile);
      },
      error: () => {
        this.imageUploading = false;
        this.notification.error('Beitrag konnte nicht gespeichert werden.');
      }
    });
  }

  private uploadImageToPost(postId: number, file: File): void {
    this.imageUploading = true;
    this.api.uploadPostImage(postId, file).subscribe({
      next: (image: PostImage) => {
        const imageWithUrl: PostImage = {
          ...image,
          url: this.api.getPostImageUrl(postId, image.id)
        };
        this.uploadedImages.push(imageWithUrl);
        this.insertImageMarkdown(imageWithUrl);
        this.imageUploading = false;
      },
      error: (err: any) => {
        this.imageUploading = false;
        const msg = err?.error?.message || 'Fehler beim Hochladen des Bildes';
        this.notification.error(msg);
      }
    });
  }

  private insertImageMarkdown(image: PostImage): void {
    const markdown = `![${image.originalName}](${image.url})`;
    const textCtrl = this.form.get('text')!;
    const currentText = textCtrl.value || '';
    const textarea = this.textareaRef;

    if (textarea) {
      const pos = textarea.selectionStart || currentText.length;
      const before = currentText.slice(0, pos);
      const after = currentText.slice(pos);
      const newLine = before.length > 0 && !before.endsWith('\n') ? '\n' : '';
      const newText = before + newLine + markdown + '\n' + after;
      textCtrl.setValue(newText);
      setTimeout(() => {
        textarea.focus();
        const cursor = (before + newLine + markdown + '\n').length;
        textarea.selectionStart = textarea.selectionEnd = cursor;
      });
    } else {
      const newLine = currentText.length > 0 && !currentText.endsWith('\n') ? '\n' : '';
      textCtrl.setValue(currentText + newLine + markdown + '\n');
    }
  }

  removeImage(image: PostImage): void {
    if (!this.postId) return;
    this.api.removePostImage(this.postId, image.id).subscribe({
      next: () => {
        this.uploadedImages = this.uploadedImages.filter(i => i.id !== image.id);
        // Remove the Markdown reference from text
        const textCtrl = this.form.get('text')!;
        const currentText = textCtrl.value || '';
        const pattern = `![${image.originalName}](${image.url})`;
        textCtrl.setValue(currentText.replace(pattern, '').replace(/\n{3,}/g, '\n\n').trim());
        this.notification.success('Bild entfernt');
      },
      error: () => this.notification.error('Fehler beim Entfernen des Bildes')
    });
  }

  getImageThumbnailUrl(image: PostImage): string {
    return image.url || '';
  }

  canUploadMoreImages(): boolean {
    return this.uploadedImages.length < this.maxImages && !this.imageUploading;
  }

  save(): void {
    if (this.form.invalid || this.saving) {
      return;
    }
    const value = this.form.getRawValue() as PostFormValue;
    const expiresAt = value.expiresAt || null;
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
    // If auto-saved as draft (postId set via image upload), use update
    const request$ = this.postId
      ? this.api.updatePost(this.postId, payload)
      : this.api.createPost(payload);
    const action: PostDialogAction = (this.isEdit || this.postId) ? 'updated' : 'created';
    const errorMessage = (this.isEdit || this.postId) ? 'Fehler beim Aktualisieren' : 'Fehler beim Speichern';
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

  private buildPollPayload(): { options: string[]; allowMultiple: boolean; maxSelections: number; closesAt: string | null; isAnonymous: boolean } | null | false {
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
    const closes = this.form.get('pollClosesAt')?.value as string | null;
    const isAnonymous = this.form.get('pollIsAnonymous')?.value !== false;
    return {
      options,
      allowMultiple,
      maxSelections,
      closesAt: closes || null,
      isAnonymous
    };
  }
}
