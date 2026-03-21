import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from '@modules/material.module';
import { CtaBlock } from '../block.model';

@Component({
  selector: 'app-cta-block-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule],
  template: `
    <div class="cta-editor">
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Button-Text</mat-label>
        <input matInput [ngModel]="block.label" (ngModelChange)="update('label', $event)" placeholder="z. B. Jetzt mitmachen" />
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Link-URL</mat-label>
        <input matInput [ngModel]="block.url" (ngModelChange)="update('url', $event)" placeholder="https://..." />
        <mat-icon matSuffix>link</mat-icon>
      </mat-form-field>

      <div class="options-row">
        <div class="option">
          <span class="label">Stil:</span>
          <mat-button-toggle-group [value]="block.style" (change)="update('style', $event.value)">
            <mat-button-toggle value="primary">Primär</mat-button-toggle>
            <mat-button-toggle value="secondary">Sekundär</mat-button-toggle>
            <mat-button-toggle value="outline">Rahmen</mat-button-toggle>
          </mat-button-toggle-group>
        </div>

        <div class="option">
          <span class="label">Ausrichtung:</span>
          <mat-button-toggle-group [value]="block.alignment" (change)="update('alignment', $event.value)">
            <mat-button-toggle value="left"><mat-icon>format_align_left</mat-icon></mat-button-toggle>
            <mat-button-toggle value="center"><mat-icon>format_align_center</mat-icon></mat-button-toggle>
            <mat-button-toggle value="right"><mat-icon>format_align_right</mat-icon></mat-button-toggle>
          </mat-button-toggle-group>
        </div>
      </div>

      <!-- Preview -->
      <div class="preview" *ngIf="block.label" [style.textAlign]="block.alignment">
        <span class="btn-preview" [class]="'btn-' + block.style">{{ block.label }}</span>
      </div>
    </div>
  `,
  styles: [`
    .cta-editor {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .full-width { width: 100%; }

    .options-row {
      display: flex;
      flex-wrap: wrap;
      gap: 1.5rem;
      margin-bottom: 0.5rem;
    }

    .option {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .label {
      font-size: 0.85rem;
      color: rgba(0, 0, 0, 0.6);
    }

    .preview {
      padding: 1rem;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 8px;
      background: #fafafa;
    }

    .btn-preview {
      display: inline-block;
      padding: 0.5rem 1.5rem;
      border-radius: 6px;
      font-weight: 500;
      font-size: 0.9rem;
      cursor: default;

      &.btn-primary {
        background: var(--pp-btn-primary-bg, #4338ca);
        color: #fff;
      }
      &.btn-secondary {
        background: rgba(0, 0, 0, 0.06);
        color: var(--pp-btn-primary-bg, #4338ca);
      }
      &.btn-outline {
        background: transparent;
        border: 2px solid var(--pp-btn-primary-bg, #4338ca);
        color: var(--pp-btn-primary-bg, #4338ca);
      }
    }
  `]
})
export class CtaBlockEditorComponent {
  @Input() block!: CtaBlock;
  @Output() blockChange = new EventEmitter<CtaBlock>();

  update(field: keyof CtaBlock, value: any): void {
    this.blockChange.emit({ ...this.block, [field]: value });
  }
}
