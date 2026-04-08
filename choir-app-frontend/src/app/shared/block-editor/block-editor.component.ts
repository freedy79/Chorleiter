import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { MaterialModule } from '@modules/material.module';
import { ContentBlock, BlockType, createBlock } from './block.model';
import { BlockToolbarComponent } from './block-toolbar.component';
import { BlockWrapperComponent } from './block-wrapper.component';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';

@Component({
  selector: 'app-block-editor',
  standalone: true,
  imports: [CommonModule, DragDropModule, MaterialModule, BlockToolbarComponent, BlockWrapperComponent],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => BlockEditorComponent),
      multi: true
    }
  ],
  template: `
    <div class="block-editor">
      <div class="block-editor__header">
        <h3>Inhaltsblöcke</h3>
        <span class="block-count">{{ blocks.length }} {{ blocks.length === 1 ? 'Block' : 'Blöcke' }}</span>
      </div>

      <div
        cdkDropList
        [cdkDropListData]="blocks"
        (cdkDropListDropped)="onDrop($event)"
        class="block-list">

        <div *ngIf="blocks.length === 0" class="block-editor__empty">
          <mat-icon>dashboard_customize</mat-icon>
          <p>Noch keine Inhaltsblöcke vorhanden.</p>
          <p class="hint">Füge unten einen Block hinzu, um deine Seite zu gestalten.</p>
        </div>

        <app-block-wrapper
          *ngFor="let block of blocks; let i = index; let first = first; let last = last"
          cdkDrag
          [cdkDragData]="block"
          [block]="block"
          [index]="i"
          [isFirst]="first"
          [isLast]="last"
          (blockChange)="onBlockChange($event, i)"
          (remove)="removeBlock(i)"
          (duplicate)="duplicateBlock(i)"
          (moveUp)="moveBlockUp(i)"
          (moveDown)="moveBlockDown(i)">
          <div class="drag-handle" cdkDragHandle>
            <mat-icon>drag_indicator</mat-icon>
          </div>
        </app-block-wrapper>
      </div>

      <app-block-toolbar (addBlock)="addBlock($event)"></app-block-toolbar>
    </div>
  `,
  styles: [`
    .block-editor {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .block-editor__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 0.25rem;

      h3 {
        margin: 0;
        font-size: 1rem;
        font-weight: 500;
      }

      .block-count {
        font-size: 0.8rem;
        color: rgba(0, 0, 0, 0.5);
      }
    }

    .block-editor__empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2rem 1rem;
      text-align: center;
      color: rgba(0, 0, 0, 0.45);
      border: 2px dashed rgba(0, 0, 0, 0.12);
      border-radius: 8px;

      mat-icon {
        font-size: 2.5rem;
        width: 2.5rem;
        height: 2.5rem;
        margin-bottom: 0.5rem;
      }

      p { margin: 0.25rem 0; }
      .hint { font-size: 0.85rem; }
    }

    .block-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      min-height: 48px;
    }

    .cdk-drag-preview {
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
      border-radius: 8px;
      opacity: 0.9;
    }

    .cdk-drag-placeholder {
      background: rgba(0, 0, 0, 0.04);
      border: 2px dashed rgba(0, 0, 0, 0.12);
      border-radius: 8px;
      min-height: 48px;
    }

    .cdk-drag-animating {
      transition: transform 200ms cubic-bezier(0, 0, 0.2, 1);
    }

    .drag-handle {
      cursor: grab;
      display: flex;
      align-items: center;
      color: rgba(0, 0, 0, 0.35);

      &:active { cursor: grabbing; }

      mat-icon { font-size: 1.25rem; }
    }
  `]
})
export class BlockEditorComponent implements ControlValueAccessor {
  @Input() blocks: ContentBlock[] = [];
  @Output() blocksChange = new EventEmitter<ContentBlock[]>();

  private onChange: (value: ContentBlock[]) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: ContentBlock[]): void {
    this.blocks = Array.isArray(value) ? [...value] : [];
  }

  registerOnChange(fn: (value: ContentBlock[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  private emitChange(): void {
    this.blocksChange.emit(this.blocks);
    this.onChange(this.blocks);
    this.onTouched();
  }

  addBlock(type: BlockType): void {
    this.blocks = [...this.blocks, createBlock(type)];
    this.emitChange();
  }

  removeBlock(index: number): void {
    this.blocks = this.blocks.filter((_, i) => i !== index);
    this.emitChange();
  }

  duplicateBlock(index: number): void {
    const original = this.blocks[index];
    const copy: ContentBlock = {
      ...JSON.parse(JSON.stringify(original)),
      id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    };
    this.blocks = [
      ...this.blocks.slice(0, index + 1),
      copy,
      ...this.blocks.slice(index + 1)
    ];
    this.emitChange();
  }

  moveBlockUp(index: number): void {
    if (index <= 0) return;
    const arr = [...this.blocks];
    [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
    this.blocks = arr;
    this.emitChange();
  }

  moveBlockDown(index: number): void {
    if (index >= this.blocks.length - 1) return;
    const arr = [...this.blocks];
    [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
    this.blocks = arr;
    this.emitChange();
  }

  onDrop(event: CdkDragDrop<ContentBlock[]>): void {
    const arr = [...this.blocks];
    moveItemInArray(arr, event.previousIndex, event.currentIndex);
    this.blocks = arr;
    this.emitChange();
  }

  onBlockChange(block: ContentBlock, index: number): void {
    this.blocks = this.blocks.map((b, i) => i === index ? block : b);
    this.emitChange();
  }
}
