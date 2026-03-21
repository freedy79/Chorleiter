import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';

interface Collection {
  id: number;
  title: string;
}

@Component({
  selector: 'app-piece-delete-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MaterialModule],
  template: `
    <h1 mat-dialog-title>Stück löschen</h1>

    <mat-dialog-content>
      <div *ngIf="data.canDelete" class="delete-confirmation">
        <mat-icon class="warning-icon">warning</mat-icon>
        <p class="warning-text">
          Möchten Sie dieses Stück wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
        </p>
      </div>

      <div *ngIf="!data.canDelete" class="cannot-delete">
        <mat-icon class="error-icon">error</mat-icon>
        <p class="error-text">
          Dieses Stück kann nicht gelöscht werden, da es in folgenden Sammlungen enthalten ist:
        </p>
        <mat-list>
          <mat-list-item *ngFor="let collection of data.collections">
            <mat-icon matListItemIcon>library_books</mat-icon>
            <div matListItemTitle>{{ collection.title }}</div>
          </mat-list-item>
        </mat-list>
        <p class="info-text">
          Bitte entfernen Sie das Stück zunächst aus allen Sammlungen, bevor Sie es löschen können.
        </p>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="closeDialog()">
        {{ data.canDelete ? 'Abbrechen' : 'Schließen' }}
      </button>
      <button
        *ngIf="data.canDelete"
        mat-raised-button
        color="warn"
        (click)="confirmDelete()">
        Löschen
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .delete-confirmation, .cannot-delete {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 16px 0;
    }

    .warning-icon, .error-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
    }

    .warning-icon {
      color: #ff9800;
    }

    .error-icon {
      color: #f44336;
    }

    .warning-text, .error-text {
      margin: 0 0 16px 0;
      line-height: 1.5;
    }

    .info-text {
      margin-top: 16px;
      font-size: 12px;
      color: rgba(0, 0, 0, 0.54);
    }

    mat-list {
      width: 100%;
      max-height: 300px;
      overflow-y: auto;
      background-color: rgba(0, 0, 0, 0.02);
      border-radius: 4px;
      margin: 16px 0;
    }
  `]
})
export class PieceDeleteDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: {
      canDelete: boolean;
      collections: Collection[];
    },
    private dialogRef: MatDialogRef<PieceDeleteDialogComponent>
  ) {}

  closeDialog(): void {
    this.dialogRef.close(false);
  }

  confirmDelete(): void {
    this.dialogRef.close(true);
  }
}
