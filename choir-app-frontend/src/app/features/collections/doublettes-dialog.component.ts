import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { NotificationService } from '@core/services/notification.service';
import { FormsModule } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { InlineLoadingComponent } from '@shared/components/inline-loading/inline-loading.component';

interface DoubletteCandidate {
  id: number;
  title: string;
  composers?: any[];
  similarity?: number;
  matchType?: string;
  collections?: any[];
}

interface DoubletteGroup {
  candidates: DoubletteCandidate[];
  matchType: string;
}

@Component({
  selector: 'app-doublettes-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MaterialModule, FormsModule, MatProgressSpinnerModule, EmptyStateComponent, InlineLoadingComponent],
  templateUrl: './doublettes-dialog.component.html',
  styleUrls: ['./doublettes-dialog.component.scss']
})
export class DoublettesDialogComponent implements OnInit {
  isLoading = false;
  groups: DoubletteGroup[] = [];
  collectionId: number;
  choirId: number;
  threshold: number = 80;
  selectedGroupIndex: number | null = null;
  selectedSourceId: number | null = null;
  selectedTargetId: number | null = null;
  isMerging = false;

  // Metadata selection
  mergeComposers = true;
  mergeCategories = true;
  mergeFiles = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { collectionId: number; choirId: number },
    private dialogRef: MatDialogRef<DoublettesDialogComponent>,
    private api: ApiService,
    private notification: NotificationService
  ) {
    this.collectionId = data.collectionId;
    this.choirId = data.choirId;
  }

  ngOnInit(): void {
    this.loadThreshold();
    this.checkDoublettes();
  }

  loadThreshold(): void {
    this.api.getDoubletteThreshold().subscribe(
      (result: { threshold: number }) => (this.threshold = result.threshold),
      () => (this.threshold = 80)
    );
  }

  checkDoublettes(): void {
    this.isLoading = true;
    this.api.checkDoublettesForCollection(this.choirId, this.collectionId, this.threshold).subscribe(
      (result: any) => {
        this.groups = result.groups || [];
        this.isLoading = false;
        if (this.groups.length === 0) {
          this.notification.success('Keine Doubletten gefunden');
        }
      },
      (error: any) => {
        this.isLoading = false;
        this.notification.error('Fehler beim Prüfen auf Doubletten');
        console.error(error);
      }
    );
  }

  selectGroup(index: number): void {
    this.selectedGroupIndex = index === this.selectedGroupIndex ? null : index;
    this.selectedSourceId = null;
    this.selectedTargetId = null;
  }

  selectSourcePiece(pieceId: number): void {
    this.selectedSourceId = pieceId;
  }

  selectTargetPiece(pieceId: number): void {
    this.selectedTargetId = pieceId;
  }

  canMerge(): boolean {
    return (
      this.selectedSourceId !== null &&
      this.selectedTargetId !== null &&
      this.selectedSourceId !== this.selectedTargetId
    );
  }

  merge(): void {
    if (!this.canMerge()) {
      this.notification.error('Bitte zwei verschiedene Stücke auswählen');
      return;
    }

    if (!confirm('Möchten Sie diese Stücke wirklich zusammenführen?')) {
      return;
    }

    this.isMerging = true;

    const group = this.selectedGroupIndex !== null ? this.groups[this.selectedGroupIndex] : null;
    const sourceCandidate = group?.candidates.find(c => c.id === this.selectedSourceId);
    const targetCandidate =  group?.candidates.find(c => c.id === this.selectedTargetId);

    const mergedMetadata = {
      composers: this.mergeComposers ? (targetCandidate?.composers || []) : [],
      categories: this.mergeCategories ? (targetCandidate?.composers || []) : [],
      sourceComposers: this.mergeComposers ? (sourceCandidate?.composers || []) : [],
      sourceCategories: this.mergeCategories ? (sourceCandidate?.composers || []) : []
    };

    this.api
      .mergePieces(this.choirId, this.selectedSourceId!, this.selectedTargetId!, mergedMetadata)
      .subscribe(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        (_result: any) => {
          this.isMerging = false;
          this.notification.success('Stücke erfolgreich zusammengeführt');
          this.dialogRef.close(true);
        },
        (error: any) => {
          this.isMerging = false;
          this.notification.error('Fehler beim Zusammenführen: ' + (error.error?.message || error.message));
          console.error(error);
        }
      );
  }

  closeDialog(): void {
    this.dialogRef.close(false);
  }

  getComposerNames(composers: any[] | undefined): string {
    if (!composers || composers.length === 0) return '-';
    return composers.map(c => c.name || c.composer_name || '-').join(', ');
  }

  getSimilarityColor(similarity?: number): string {
    if (!similarity) return 'accent';
    if (similarity >= 95) return 'primary';
    if (similarity >= 80) return 'accent';
    return 'warn';
  }
}
