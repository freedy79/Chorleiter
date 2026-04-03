import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from '@modules/material.module';
import { HeroBannerBlock } from '../block.model';

@Component({
  selector: 'app-hero-banner-block-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule],
  template: `
    <div class="hero-banner-editor">
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Überschrift</mat-label>
        <input matInput [ngModel]="block.headline" (ngModelChange)="update('headline', $event)" />
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Unterüberschrift</mat-label>
        <textarea matInput rows="2" [ngModel]="block.subheadline" (ngModelChange)="update('subheadline', $event)"></textarea>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Bild-URL</mat-label>
        <input matInput [ngModel]="block.imageUrl" (ngModelChange)="update('imageUrl', $event)" placeholder="https://..." />
        <mat-icon matSuffix>image</mat-icon>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Bild-Alternativtext</mat-label>
        <input matInput [ngModel]="block.imageAlt" (ngModelChange)="update('imageAlt', $event)" />
      </mat-form-field>

      <div class="row">
        <mat-form-field appearance="outline">
          <mat-label>Button-Text</mat-label>
          <input matInput [ngModel]="block.ctaLabel" (ngModelChange)="update('ctaLabel', $event)" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Button-Link</mat-label>
          <input matInput [ngModel]="block.ctaUrl" (ngModelChange)="update('ctaUrl', $event)" placeholder="https://..." />
        </mat-form-field>
      </div>

      <mat-checkbox [ngModel]="block.overlay" (ngModelChange)="update('overlay', $event)">
        Dunkles Overlay über Bild
      </mat-checkbox>

      <!-- Preview -->
      <div class="preview" *ngIf="block.imageUrl || block.headline">
        <div class="preview-banner"
             [style.backgroundImage]="block.imageUrl ? 'url(' + block.imageUrl + ')' : 'none'"
             [class.has-overlay]="block.overlay">
          <div class="preview-content">
            <h3 *ngIf="block.headline">{{ block.headline }}</h3>
            <p *ngIf="block.subheadline">{{ block.subheadline }}</p>
            <span class="preview-btn" *ngIf="block.ctaLabel">{{ block.ctaLabel }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .hero-banner-editor {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .full-width { width: 100%; }

    .row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }

    .preview {
      margin-top: 0.5rem;
      border-radius: 8px;
      overflow: hidden;
    }

    .preview-banner {
      position: relative;
      min-height: 140px;
      background-size: cover;
      background-position: center;
      background-color: #e5e7eb;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;

      &.has-overlay::before {
        content: '';
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.45);
      }
    }

    .preview-content {
      position: relative;
      z-index: 1;
      text-align: center;
      color: #333;

      .has-overlay & { color: #fff; }

      h3 { margin: 0 0 0.25rem; font-size: 1.25rem; }
      p { margin: 0 0 0.5rem; font-size: 0.9rem; opacity: 0.85; }
    }

    .preview-btn {
      display: inline-block;
      padding: 0.35rem 1rem;
      background: var(--pp-btn-primary-bg, #4338ca);
      color: #fff;
      border-radius: 4px;
      font-size: 0.85rem;
    }
  `]
})
export class HeroBannerBlockEditorComponent {
  @Input() block!: HeroBannerBlock;
  @Output() blockChange = new EventEmitter<HeroBannerBlock>();

  update(field: keyof HeroBannerBlock, value: any): void {
    this.blockChange.emit({ ...this.block, [field]: value });
  }
}
