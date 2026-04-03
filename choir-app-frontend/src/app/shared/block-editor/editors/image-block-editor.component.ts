import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from '@modules/material.module';
import { ImageBlock } from '../block.model';

@Component({
  selector: 'app-image-block-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule],
  template: `
    <div class="image-block-editor">
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Bild-URL</mat-label>
        <input matInput [ngModel]="block.imageUrl" (ngModelChange)="update('imageUrl', $event)" placeholder="https://..." />
        <mat-icon matSuffix>image</mat-icon>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Alternativtext</mat-label>
        <input matInput [ngModel]="block.imageAlt" (ngModelChange)="update('imageAlt', $event)"
               placeholder="Beschreibung des Bildes" />
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Bildunterschrift</mat-label>
        <input matInput [ngModel]="block.caption" (ngModelChange)="update('caption', $event)" />
      </mat-form-field>

      <div class="alignment-row">
        <span class="alignment-label">Ausrichtung:</span>
        <mat-button-toggle-group [value]="block.alignment" (change)="update('alignment', $event.value)">
          <mat-button-toggle value="left" matTooltip="Links">
            <mat-icon>format_align_left</mat-icon>
          </mat-button-toggle>
          <mat-button-toggle value="center" matTooltip="Zentriert">
            <mat-icon>format_align_center</mat-icon>
          </mat-button-toggle>
          <mat-button-toggle value="right" matTooltip="Rechts">
            <mat-icon>format_align_right</mat-icon>
          </mat-button-toggle>
          <mat-button-toggle value="full" matTooltip="Volle Breite">
            <mat-icon>aspect_ratio</mat-icon>
          </mat-button-toggle>
        </mat-button-toggle-group>
      </div>

      <!-- Preview -->
      <div class="preview" *ngIf="block.imageUrl" [style.textAlign]="block.alignment === 'full' ? 'center' : block.alignment">
        <img [src]="block.imageUrl" [alt]="block.imageAlt || ''" [class]="'align-' + block.alignment" />
        <p class="caption" *ngIf="block.caption">{{ block.caption }}</p>
      </div>
    </div>
  `,
  styles: [`
    .image-block-editor {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .full-width { width: 100%; }

    .alignment-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.5rem;
    }

    .alignment-label {
      font-size: 0.85rem;
      color: rgba(0, 0, 0, 0.6);
    }

    .preview {
      margin-top: 0.5rem;
      padding: 0.5rem;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 8px;
      background: #fafafa;

      img {
        max-width: 100%;
        max-height: 200px;
        border-radius: 4px;
        object-fit: contain;

        &.align-full { width: 100%; max-height: 300px; object-fit: cover; }
        &.align-left, &.align-right { max-width: 60%; }
      }

      .caption {
        font-size: 0.8rem;
        color: rgba(0, 0, 0, 0.5);
        margin: 0.35rem 0 0;
        font-style: italic;
      }
    }
  `]
})
export class ImageBlockEditorComponent {
  @Input() block!: ImageBlock;
  @Output() blockChange = new EventEmitter<ImageBlock>();

  update(field: keyof ImageBlock, value: any): void {
    this.blockChange.emit({ ...this.block, [field]: value });
  }
}
