import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from '@modules/material.module';
import { SpacerBlock } from '../block.model';

const SPACER_HEIGHTS: Record<string, string> = {
  small: '1rem',
  medium: '2.5rem',
  large: '5rem'
};

@Component({
  selector: 'app-spacer-block-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule],
  template: `
    <div class="spacer-editor">
      <div class="size-row">
        <span class="label">Höhe:</span>
        <mat-button-toggle-group [value]="block.height" (change)="update($event.value)">
          <mat-button-toggle value="small">Klein</mat-button-toggle>
          <mat-button-toggle value="medium">Mittel</mat-button-toggle>
          <mat-button-toggle value="large">Groß</mat-button-toggle>
        </mat-button-toggle-group>
      </div>

      <div class="preview">
        <div class="spacer-preview" [style.height]="spacerHeights[block.height]"></div>
      </div>
    </div>
  `,
  styles: [`
    .spacer-editor {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .size-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .label {
      font-size: 0.85rem;
      color: rgba(0, 0, 0, 0.6);
    }

    .preview {
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 4px;
      background: repeating-linear-gradient(
        45deg,
        transparent,
        transparent 5px,
        rgba(0, 0, 0, 0.03) 5px,
        rgba(0, 0, 0, 0.03) 10px
      );
    }

    .spacer-preview {
      transition: height 0.2s ease;
    }
  `]
})
export class SpacerBlockEditorComponent {
  @Input() block!: SpacerBlock;
  @Output() blockChange = new EventEmitter<SpacerBlock>();

  spacerHeights = SPACER_HEIGHTS;

  update(height: string): void {
    this.blockChange.emit({ ...this.block, height: height as SpacerBlock['height'] });
  }
}
