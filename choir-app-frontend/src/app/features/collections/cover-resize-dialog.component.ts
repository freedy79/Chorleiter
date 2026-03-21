import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { NotificationService } from '@core/services/notification.service';

export interface CoverResizeDialogData {
  collectionId: number;
  collectionTitle: string;
  currentCover: string;
}

@Component({
  selector: 'app-cover-resize-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule, MatDialogModule],
  template: `
    <h1 mat-dialog-title>Coverbild anpassen</h1>

    <mat-dialog-content>
      <p class="subtitle">
        Ändern Sie die maximale Breite des Coverbildes. Die Höhe wird proportional angepasst.
      </p>

      <div class="preview-container">
        <h3>Vorschau</h3>
        <div class="image-display">
          <img [src]="data.currentCover" alt="Cover preview" />
          <p class="image-dimensions">
            {{ currentDimensions.width }} × {{ currentDimensions.height }} px
          </p>
        </div>
      </div>

      <div class="resize-controls">
        <mat-form-field appearance="outline" class="width-input">
          <mat-label>Maximale Breite (px)</mat-label>
          <input
            matInput
            type="number"
            min="10"
            max="2000"
            [(ngModel)]="selectedWidth"
            (change)="updatePreview()"
            [disabled]="isResizing"
          />
          <mat-hint>Empfohlen: 150px für optimale Ladezeit</mat-hint>
        </mat-form-field>

        <div class="preset-buttons">
          <p class="preset-label">Voreinstellungen:</p>
          <button
            mat-stroked-button
            (click)="setWidth(100)"
            [disabled]="isResizing"
            class="preset-btn">
            100 px
          </button>
          <button
            mat-stroked-button
            (click)="setWidth(150)"
            [disabled]="isResizing"
            [class.active]="selectedWidth === 150"
            class="preset-btn">
            150 px
          </button>
          <button
            mat-stroked-button
            (click)="setWidth(200)"
            [disabled]="isResizing"
            class="preset-btn">
            200 px
          </button>
          <button
            mat-stroked-button
            (click)="setWidth(300)"
            [disabled]="isResizing"
            class="preset-btn">
            300 px
          </button>
        </div>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button
        mat-button
        (click)="onCancel()"
        [disabled]="isResizing">
        Abbrechen
      </button>
      <button
        mat-raised-button
        color="primary"
        (click)="onResize()"
        [disabled]="isResizing || !isWidthValid()">
        <mat-spinner diameter="20" *ngIf="isResizing"></mat-spinner>
        <span *ngIf="!isResizing">Anwenden</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .subtitle {
      color: #666;
      font-size: 0.9rem;
      margin-bottom: 24px;
    }

    .preview-container {
      margin-bottom: 32px;

      h3 {
        font-size: 0.95rem;
        font-weight: 500;
        margin: 0 0 12px 0;
        color: #333;
      }
    }

    .image-display {
      background: #f5f5f5;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 16px;
      text-align: center;

      img {
        max-width: 100%;
        max-height: 300px;
        display: block;
        margin: 0 auto 8px;
      }

      .image-dimensions {
        font-size: 0.85rem;
        color: #999;
        margin: 0;
      }
    }

    .resize-controls {
      margin-bottom: 24px;
    }

    .width-input {
      width: 100%;
      margin-bottom: 24px;
    }

    .preset-label {
      font-size: 0.9rem;
      font-weight: 500;
      color: #666;
      margin: 0 0 8px 0;
    }

    .preset-buttons {
      display: flex;
      flex-direction: column;
      gap: 8px;

      .preset-btn {
        width: 100%;
        &.active {
          background-color: #1976d2;
          color: white;
        }
      }
    }

    mat-dialog-actions {
      margin-top: 24px;
      gap: 8px;

      button:disabled {
        opacity: 0.5;
      }
    }

    mat-spinner {
      display: inline-block;
      margin-right: 8px;
    }

    @media (max-width: 600px) {
      .preset-buttons {
        flex-direction: row;
        flex-wrap: wrap;

        .preset-btn {
          flex: 1;
          min-width: calc(50% - 4px);
        }
      }
    }
  `]
})
export class CoverResizeDialogComponent {
  selectedWidth = 150;
  isResizing = false;
  currentDimensions = { width: 0, height: 0 };

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: CoverResizeDialogData,
    private api: ApiService,
    private notification: NotificationService,
    private dialogRef: MatDialogRef<CoverResizeDialogComponent>
  ) {
    this.updatePreview();
  }

  setWidth(width: number): void {
    this.selectedWidth = width;
    this.updatePreview();
  }

  isWidthValid(): boolean {
    return this.selectedWidth >= 10 && this.selectedWidth <= 2000;
  }

  updatePreview(): void {
    // In a real implementation, you might want to show a preview of the resized dimensions
    // For now, we'll just update if the image is loaded
    const img = new Image();
    img.src = this.data.currentCover;
    img.onload = () => {
      this.currentDimensions = {
        width: img.width,
        height: img.height
      };
    };
  }

  onResize(): void {
    if (!this.isWidthValid()) {
      this.notification.error('Ungültige Breite. Bitte wählen Sie einen Wert zwischen 10 und 2000 Pixeln.', 3000);
      return;
    }

    this.isResizing = true;
    this.api.resizeCollectionCover(this.data.collectionId, this.selectedWidth).subscribe({
      next: (response) => {
        this.isResizing = false;
        this.notification.success(`Coverbild erfolgreich auf ${this.selectedWidth}px angepasst.`, 3000);
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.isResizing = false;
        const errorMsg = err?.error?.message || 'Fehler beim Anpassen des Coverbildes.';
        this.notification.error(errorMsg, 5000);
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
