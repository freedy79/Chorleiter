import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { BlockType, BLOCK_TYPES, BlockTypeInfo } from './block.model';

@Component({
  selector: 'app-block-toolbar',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  template: `
    <div class="block-toolbar">
      <button mat-stroked-button [matMenuTriggerFor]="blockMenu" type="button" class="add-block-btn">
        <mat-icon>add</mat-icon> Block hinzufügen
      </button>

      <mat-menu #blockMenu="matMenu" class="block-type-menu">
        <button mat-menu-item
                *ngFor="let bt of blockTypes"
                (click)="addBlock.emit(bt.type)">
          <mat-icon>{{ bt.icon }}</mat-icon>
          <div class="block-type-info">
            <span class="block-type-label">{{ bt.label }}</span>
            <span class="block-type-desc">{{ bt.description }}</span>
          </div>
        </button>
      </mat-menu>
    </div>
  `,
  styles: [`
    .block-toolbar {
      display: flex;
      justify-content: center;
      padding: 0.75rem 0;
    }

    .add-block-btn {
      border-style: dashed;
    }

    .block-type-info {
      display: flex;
      flex-direction: column;
      line-height: 1.3;
    }

    .block-type-label {
      font-weight: 500;
    }

    .block-type-desc {
      font-size: 0.75rem;
      color: rgba(0, 0, 0, 0.5);
    }
  `]
})
export class BlockToolbarComponent {
  @Output() addBlock = new EventEmitter<BlockType>();
  blockTypes: BlockTypeInfo[] = BLOCK_TYPES;
}
