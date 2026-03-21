import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from '@modules/material.module';
import { QuoteBlock } from '../block.model';

@Component({
  selector: 'app-quote-block-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule],
  template: `
    <div class="quote-editor">
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Zitat</mat-label>
        <textarea matInput rows="3" [ngModel]="block.text" (ngModelChange)="update('text', $event)"></textarea>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Quelle / Autor</mat-label>
        <input matInput [ngModel]="block.attribution" (ngModelChange)="update('attribution', $event)"
               placeholder="z. B. Johann Sebastian Bach" />
      </mat-form-field>

      <!-- Preview -->
      <blockquote class="preview" *ngIf="block.text">
        <p>{{ block.text }}</p>
        <cite *ngIf="block.attribution">— {{ block.attribution }}</cite>
      </blockquote>
    </div>
  `,
  styles: [`
    .quote-editor {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .full-width { width: 100%; }

    .preview {
      margin: 0.5rem 0 0;
      padding: 1rem 1.25rem;
      border-left: 4px solid var(--pp-btn-primary-bg, #4338ca);
      background: rgba(0, 0, 0, 0.02);
      border-radius: 0 8px 8px 0;

      p {
        margin: 0;
        font-size: 1.05rem;
        font-style: italic;
        color: rgba(0, 0, 0, 0.75);
        line-height: 1.5;
      }

      cite {
        display: block;
        margin-top: 0.5rem;
        font-size: 0.85rem;
        color: rgba(0, 0, 0, 0.5);
        font-style: normal;
      }
    }
  `]
})
export class QuoteBlockEditorComponent {
  @Input() block!: QuoteBlock;
  @Output() blockChange = new EventEmitter<QuoteBlock>();

  update(field: keyof QuoteBlock, value: string): void {
    this.blockChange.emit({ ...this.block, [field]: value });
  }
}
