import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from '@modules/material.module';
import { GalleryBlock, GalleryImage } from '../block.model';

@Component({
  selector: 'app-gallery-block-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule],
  template: `
    <div class="gallery-editor">
      <div class="columns-row">
        <span class="label">Spalten:</span>
        <mat-button-toggle-group [value]="block.columns" (change)="updateColumns($event.value)">
          <mat-button-toggle [value]="2">2</mat-button-toggle>
          <mat-button-toggle [value]="3">3</mat-button-toggle>
          <mat-button-toggle [value]="4">4</mat-button-toggle>
        </mat-button-toggle-group>
      </div>

      <!-- Image list -->
      <div class="image-list" *ngIf="block.images.length">
        <div class="image-entry" *ngFor="let img of block.images; let i = index">
          <div class="image-thumb" *ngIf="img.url">
            <img [src]="img.url" [alt]="img.alt || ''" />
          </div>
          <div class="image-fields">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Bild-URL</mat-label>
              <input matInput [ngModel]="img.url" (ngModelChange)="updateImage(i, 'url', $event)" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Alt-Text</mat-label>
              <input matInput [ngModel]="img.alt" (ngModelChange)="updateImage(i, 'alt', $event)" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Beschriftung</mat-label>
              <input matInput [ngModel]="img.caption" (ngModelChange)="updateImage(i, 'caption', $event)" />
            </mat-form-field>
          </div>
          <button mat-icon-button color="warn" (click)="removeImage(i)" matTooltip="Entfernen" type="button">
            <mat-icon>delete</mat-icon>
          </button>
        </div>
      </div>

      <button mat-stroked-button type="button" (click)="addImage()">
        <mat-icon>add_photo_alternate</mat-icon> Bild hinzufügen
      </button>

      <!-- Preview -->
      <div class="preview-grid" *ngIf="block.images.length" [style.gridTemplateColumns]="'repeat(' + block.columns + ', 1fr)'">
        <div class="preview-item" *ngFor="let img of block.images">
          <img *ngIf="img.url" [src]="img.url" [alt]="img.alt || ''" />
          <span class="preview-caption" *ngIf="img.caption">{{ img.caption }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .gallery-editor {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .full-width { width: 100%; }

    .columns-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .label {
      font-size: 0.85rem;
      color: rgba(0, 0, 0, 0.6);
    }

    .image-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .image-entry {
      display: flex;
      gap: 0.75rem;
      align-items: flex-start;
      padding: 0.5rem;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 6px;
    }

    .image-thumb {
      flex-shrink: 0;
      width: 64px;
      height: 64px;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 4px;
      }
    }

    .image-fields {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    .preview-grid {
      display: grid;
      gap: 0.5rem;
      margin-top: 0.5rem;
      padding: 0.5rem;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 8px;
      background: #fafafa;
    }

    .preview-item {
      text-align: center;

      img {
        width: 100%;
        height: 80px;
        object-fit: cover;
        border-radius: 4px;
      }

      .preview-caption {
        display: block;
        font-size: 0.7rem;
        color: rgba(0, 0, 0, 0.5);
        margin-top: 0.15rem;
      }
    }
  `]
})
export class GalleryBlockEditorComponent {
  @Input() block!: GalleryBlock;
  @Output() blockChange = new EventEmitter<GalleryBlock>();

  updateColumns(columns: number): void {
    this.blockChange.emit({ ...this.block, columns: columns as 2 | 3 | 4 });
  }

  addImage(): void {
    const images = [...this.block.images, { url: '', alt: '', caption: '' }];
    this.blockChange.emit({ ...this.block, images });
  }

  removeImage(index: number): void {
    const images = this.block.images.filter((_, i) => i !== index);
    this.blockChange.emit({ ...this.block, images });
  }

  updateImage(index: number, field: keyof GalleryImage, value: string): void {
    const images = this.block.images.map((img, i) =>
      i === index ? { ...img, [field]: value } : img
    );
    this.blockChange.emit({ ...this.block, images });
  }
}
