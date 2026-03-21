import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from '@modules/material.module';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import {
  ClassicEditor, Essentials, Paragraph, Bold, Italic, Underline,
  Link, List, Heading, EditorConfig
} from 'ckeditor5';
import { ImageTextBlock } from '../block.model';

@Component({
  selector: 'app-image-text-block-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule, CKEditorModule],
  template: `
    <div class="image-text-editor">
      <div class="position-row">
        <span class="label">Bild-Position:</span>
        <mat-button-toggle-group [value]="block.imagePosition" (change)="update('imagePosition', $event.value)">
          <mat-button-toggle value="left">Links</mat-button-toggle>
          <mat-button-toggle value="right">Rechts</mat-button-toggle>
        </mat-button-toggle-group>
      </div>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Bild-URL</mat-label>
        <input matInput [ngModel]="block.imageUrl" (ngModelChange)="update('imageUrl', $event)" placeholder="https://..." />
        <mat-icon matSuffix>image</mat-icon>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Bild-Alternativtext</mat-label>
        <input matInput [ngModel]="block.imageAlt" (ngModelChange)="update('imageAlt', $event)" />
      </mat-form-field>

      <div class="editor-section">
        <label class="editor-label">Text</label>
        <ckeditor
          [editor]="Editor"
          [config]="editorConfig"
          [data]="block.html"
          (change)="onEditorChange($event)">
        </ckeditor>
      </div>

      <!-- Preview -->
      <div class="preview" [class.reversed]="block.imagePosition === 'right'" *ngIf="block.imageUrl || block.html">
        <div class="preview-image" *ngIf="block.imageUrl">
          <img [src]="block.imageUrl" [alt]="block.imageAlt || ''" />
        </div>
        <div class="preview-text" [innerHTML]="block.html"></div>
      </div>
    </div>
  `,
  styles: [`
    .image-text-editor {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .full-width { width: 100%; }

    .position-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .label {
      font-size: 0.85rem;
      color: rgba(0, 0, 0, 0.6);
    }

    .editor-section {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .editor-label {
      font-size: 0.85rem;
      font-weight: 500;
      color: rgba(0, 0, 0, 0.6);
    }

    .preview {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-top: 0.5rem;
      padding: 0.75rem;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 8px;
      background: #fafafa;

      &.reversed {
        direction: rtl;
        > * { direction: ltr; }
      }
    }

    .preview-image img {
      width: 100%;
      max-height: 160px;
      object-fit: cover;
      border-radius: 4px;
    }

    .preview-text {
      font-size: 0.85rem;
      color: rgba(0, 0, 0, 0.7);
      overflow: hidden;
    }
  `]
})
export class ImageTextBlockEditorComponent {
  @Input() block!: ImageTextBlock;
  @Output() blockChange = new EventEmitter<ImageTextBlock>();

  public Editor = ClassicEditor;
  public editorConfig: EditorConfig = {
    plugins: [Essentials, Paragraph, Bold, Italic, Underline, Link, List, Heading],
    toolbar: ['heading', '|', 'bold', 'italic', 'underline', '|', 'bulletedList', 'numberedList', '|', 'link', '|', 'undo', 'redo'],
    heading: {
      options: [
        { model: 'paragraph', title: 'Absatz', class: 'ck-heading_paragraph' },
        { model: 'heading3', view: 'h3', title: 'Überschrift 3', class: 'ck-heading_heading3' },
        { model: 'heading4', view: 'h4', title: 'Überschrift 4', class: 'ck-heading_heading4' }
      ]
    },
    licenseKey: 'GPL'
  };

  update(field: keyof ImageTextBlock, value: any): void {
    this.blockChange.emit({ ...this.block, [field]: value });
  }

  onEditorChange(event: any): void {
    const data = event.editor.getData();
    this.blockChange.emit({ ...this.block, html: data });
  }
}
