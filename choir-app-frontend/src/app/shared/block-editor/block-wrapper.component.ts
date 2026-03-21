import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { ContentBlock, BLOCK_TYPES } from './block.model';
import { RichTextBlockEditorComponent } from './editors/rich-text-block-editor.component';
import { HeroBannerBlockEditorComponent } from './editors/hero-banner-block-editor.component';
import { ImageBlockEditorComponent } from './editors/image-block-editor.component';
import { ImageTextBlockEditorComponent } from './editors/image-text-block-editor.component';
import { GalleryBlockEditorComponent } from './editors/gallery-block-editor.component';
import { DividerBlockEditorComponent } from './editors/divider-block-editor.component';
import { SpacerBlockEditorComponent } from './editors/spacer-block-editor.component';
import { QuoteBlockEditorComponent } from './editors/quote-block-editor.component';
import { CtaBlockEditorComponent } from './editors/cta-block-editor.component';
import { EmbedBlockEditorComponent } from './editors/embed-block-editor.component';

@Component({
  selector: 'app-block-wrapper',
  standalone: true,
  imports: [
    CommonModule, MaterialModule,
    RichTextBlockEditorComponent, HeroBannerBlockEditorComponent,
    ImageBlockEditorComponent, ImageTextBlockEditorComponent,
    GalleryBlockEditorComponent, DividerBlockEditorComponent,
    SpacerBlockEditorComponent, QuoteBlockEditorComponent,
    CtaBlockEditorComponent, EmbedBlockEditorComponent
  ],
  template: `
    <div class="block-wrapper" [class.block-wrapper--collapsed]="collapsed">
      <!-- Block header -->
      <div class="block-wrapper__header">
        <ng-content select=".drag-handle"></ng-content>

        <div class="block-meta" (click)="collapsed = !collapsed">
          <mat-icon class="block-type-icon">{{ typeIcon }}</mat-icon>
          <span class="block-type-label">{{ typeLabel }}</span>
          <span class="block-index">#{{ index + 1 }}</span>
          <mat-icon class="collapse-icon">{{ collapsed ? 'expand_more' : 'expand_less' }}</mat-icon>
        </div>

        <div class="block-actions">
          <button mat-icon-button matTooltip="Nach oben" [disabled]="isFirst" (click)="moveUp.emit()" type="button">
            <mat-icon>arrow_upward</mat-icon>
          </button>
          <button mat-icon-button matTooltip="Nach unten" [disabled]="isLast" (click)="moveDown.emit()" type="button">
            <mat-icon>arrow_downward</mat-icon>
          </button>
          <button mat-icon-button matTooltip="Duplizieren" (click)="duplicate.emit()" type="button">
            <mat-icon>content_copy</mat-icon>
          </button>
          <button mat-icon-button matTooltip="Entfernen" color="warn" (click)="remove.emit()" type="button">
            <mat-icon>delete</mat-icon>
          </button>
        </div>
      </div>

      <!-- Block editor body -->
      <div class="block-wrapper__body" *ngIf="!collapsed" [ngSwitch]="block.type">
        <app-rich-text-block-editor
          *ngSwitchCase="'rich-text'"
          [block]="$any(block)"
          (blockChange)="blockChange.emit($event)">
        </app-rich-text-block-editor>

        <app-hero-banner-block-editor
          *ngSwitchCase="'hero-banner'"
          [block]="$any(block)"
          (blockChange)="blockChange.emit($event)">
        </app-hero-banner-block-editor>

        <app-image-block-editor
          *ngSwitchCase="'image'"
          [block]="$any(block)"
          (blockChange)="blockChange.emit($event)">
        </app-image-block-editor>

        <app-image-text-block-editor
          *ngSwitchCase="'image-text'"
          [block]="$any(block)"
          (blockChange)="blockChange.emit($event)">
        </app-image-text-block-editor>

        <app-gallery-block-editor
          *ngSwitchCase="'gallery'"
          [block]="$any(block)"
          (blockChange)="blockChange.emit($event)">
        </app-gallery-block-editor>

        <app-divider-block-editor
          *ngSwitchCase="'divider'"
          [block]="$any(block)"
          (blockChange)="blockChange.emit($event)">
        </app-divider-block-editor>

        <app-spacer-block-editor
          *ngSwitchCase="'spacer'"
          [block]="$any(block)"
          (blockChange)="blockChange.emit($event)">
        </app-spacer-block-editor>

        <app-quote-block-editor
          *ngSwitchCase="'quote'"
          [block]="$any(block)"
          (blockChange)="blockChange.emit($event)">
        </app-quote-block-editor>

        <app-cta-block-editor
          *ngSwitchCase="'cta'"
          [block]="$any(block)"
          (blockChange)="blockChange.emit($event)">
        </app-cta-block-editor>

        <app-embed-block-editor
          *ngSwitchCase="'embed'"
          [block]="$any(block)"
          (blockChange)="blockChange.emit($event)">
        </app-embed-block-editor>
      </div>
    </div>
  `,
  styles: [`
    .block-wrapper {
      border: 1px solid rgba(0, 0, 0, 0.12);
      border-radius: 8px;
      background: #fff;
      overflow: hidden;
      transition: box-shadow 0.15s ease;

      &:hover {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      }
    }

    .block-wrapper__header {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.4rem 0.5rem;
      background: rgba(0, 0, 0, 0.02);
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    }

    .block-meta {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      flex: 1;
      cursor: pointer;
      padding: 0.15rem 0.25rem;
      border-radius: 4px;
      user-select: none;

      &:hover { background: rgba(0, 0, 0, 0.04); }
    }

    .block-type-icon {
      font-size: 1.1rem;
      width: 1.1rem;
      height: 1.1rem;
      color: rgba(0, 0, 0, 0.5);
    }

    .block-type-label {
      font-size: 0.85rem;
      font-weight: 500;
    }

    .block-index {
      font-size: 0.75rem;
      color: rgba(0, 0, 0, 0.35);
    }

    .collapse-icon {
      font-size: 1.1rem;
      width: 1.1rem;
      height: 1.1rem;
      color: rgba(0, 0, 0, 0.35);
      margin-left: auto;
    }

    .block-actions {
      display: flex;
      gap: 0;

      button {
        transform: scale(0.85);
      }
    }

    .block-wrapper__body {
      padding: 1rem;
    }

    .block-wrapper--collapsed .block-wrapper__header {
      border-bottom: none;
    }
  `]
})
export class BlockWrapperComponent {
  @Input() block!: ContentBlock;
  @Input() index = 0;
  @Input() isFirst = false;
  @Input() isLast = false;

  @Output() blockChange = new EventEmitter<ContentBlock>();
  @Output() remove = new EventEmitter<void>();
  @Output() duplicate = new EventEmitter<void>();
  @Output() moveUp = new EventEmitter<void>();
  @Output() moveDown = new EventEmitter<void>();

  collapsed = false;

  get typeLabel(): string {
    return BLOCK_TYPES.find(bt => bt.type === this.block.type)?.label || this.block.type;
  }

  get typeIcon(): string {
    return BLOCK_TYPES.find(bt => bt.type === this.block.type)?.icon || 'extension';
  }
}
