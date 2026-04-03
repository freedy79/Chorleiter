import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from '@modules/material.module';
import { DividerBlock } from '../block.model';

@Component({
  selector: 'app-divider-block-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule],
  template: `
    <div class="divider-editor">
      <div class="style-row">
        <span class="label">Stil:</span>
        <mat-button-toggle-group [value]="block.style" (change)="update($event.value)">
          <mat-button-toggle value="solid">Durchgezogen</mat-button-toggle>
          <mat-button-toggle value="dashed">Gestrichelt</mat-button-toggle>
          <mat-button-toggle value="dotted">Gepunktet</mat-button-toggle>
          <mat-button-toggle value="double">Doppelt</mat-button-toggle>
        </mat-button-toggle-group>
      </div>

      <div class="preview">
        <hr [style.borderStyle]="block.style" />
      </div>
    </div>
  `,
  styles: [`
    .divider-editor {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .style-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .label {
      font-size: 0.85rem;
      color: rgba(0, 0, 0, 0.6);
    }

    .preview hr {
      border-width: 1.5px 0 0 0;
      border-color: rgba(0, 0, 0, 0.2);
      margin: 0.5rem 0;
    }
  `]
})
export class DividerBlockEditorComponent {
  @Input() block!: DividerBlock;
  @Output() blockChange = new EventEmitter<DividerBlock>();

  update(style: string): void {
    this.blockChange.emit({ ...this.block, style: style as DividerBlock['style'] });
  }
}
