import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { CommonModule } from '@angular/common';

interface ItemType {
  type: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-add-item-type-dialog',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  template: `
    <h2 mat-dialog-title>Element hinzufügen</h2>
    <mat-dialog-content>
      <div class="item-type-list">
        <button mat-button class="item-type-btn" *ngFor="let item of itemTypes" (click)="select(item.type)">
          <mat-icon>{{ item.icon }}</mat-icon>
          <span>{{ item.label }}</span>
        </button>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-button mat-dialog-close>Abbrechen</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .item-type-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 16px 0;
    }

    .item-type-btn {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 12px 16px;
      text-align: left;
      justify-content: flex-start;
      width: 100%;

      mat-icon {
        color: #1976d2;
      }

      span {
        flex: 1;
      }
    }
  `]
})
export class AddItemTypeDialogComponent {
  itemTypes: ItemType[] = [
    { type: 'piece', label: 'Stück aus Bibliothek', icon: 'library_music' },
    { type: 'freePiece', label: 'Freies Stück', icon: 'music_note' },
    { type: 'speech', label: 'Sprachbeitrag / Text', icon: 'text_fields' },
    { type: 'break', label: 'Pause', icon: 'access_time' },
  ];

  constructor(private dialogRef: MatDialogRef<AddItemTypeDialogComponent>) {}

  select(type: string): void {
    this.dialogRef.close(type);
  }
}
