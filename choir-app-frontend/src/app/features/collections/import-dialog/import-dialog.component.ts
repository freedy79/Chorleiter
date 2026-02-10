import { Component, Inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NotificationService } from '@core/services/notification.service';
import { Subscription, timer } from 'rxjs';
import { switchMap, takeWhile } from 'rxjs/operators';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from 'src/app/core/services/api.service';

@Component({
  selector: 'app-import-dialog',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './import-dialog.component.html',
  styleUrls: ['./import-dialog.component.scss']
})
export class ImportDialogComponent implements OnDestroy {
  selectedFile: File | null = null;
  previewData: any[] = [];
  isLoading = false;
  isImporting = false; // Steuert den Import-Zustand

  resolutions: Record<number, { composerId?: number; pieceId?: number; createNewPiece?: boolean; createNewComposer?: boolean }> = {};

  // Für den Import-Fortschritt
  importLogs: string[] = [];
  importProgress = 0;
  private statusSubscription?: Subscription;

  previewColumns: string[] = ['nummer', 'titel', 'komponist', 'kategorie', 'komponistMatch', 'titelMatch'];

  constructor(
    public dialogRef: MatDialogRef<ImportDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { collectionId: number, collectionTitle: string },
    private apiService: ApiService,
    private notification: NotificationService
  ) {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.previewData = [];
      this.isImporting = false; // Wichtig: Zurücksetzen, falls ein neuer Upload versucht wird
      this.getPreview();
    }
  }

  getPreview(): void {
    if (!this.selectedFile) return;
    this.isLoading = true;
    this.apiService.uploadCollectionCsv(this.data.collectionId, this.selectedFile, 'preview').subscribe({
      next: (preview) => {
        this.previewData = preview;
        this.initializeResolutions(preview);
        this.isLoading = false;
      },
      error: (err) => {
        const detail = err.error?.detail ? ` - ${err.error.detail}` : '';
        const hint = err.error?.hint ? ` (${err.error.hint})` : '';
        this.notification.error(
          `Fehler beim Laden der Vorschau: ${err.error?.message || 'Unbekannter Fehler'}${detail}${hint}`
        );
        this.isLoading = false;
      }
    });
  }

  onImport(): void {
    if (!this.selectedFile) return;
    this.isLoading = true;
    this.isImporting = true;
    this.importLogs = ['Importvorgang wird gestartet...'];
    this.importProgress = 0;

    this.apiService.startCollectionCsvImport(this.data.collectionId, this.selectedFile, this.resolutions).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.pollStatus(response.jobId);
      },
      error: (err) => {
        const detail = err.error?.detail ? ` - ${err.error.detail}` : '';
        const hint = err.error?.hint ? ` (${err.error.hint})` : '';
        this.notification.error(
          `Import konnte nicht gestartet werden: ${err.error?.message || 'Unbekannter Fehler'}${detail}${hint}`
        );
        this.isLoading = false;
        this.isImporting = false;
      }
    });
  }

  // --- KORRIGIERTE POLLING-METHODE ---
  private pollStatus(jobId: string): void {
    // Beenden Sie eine eventuell laufende vorherige Subscription
    if (this.statusSubscription) {
      this.statusSubscription.unsubscribe();
    }

    // `timer(0, 2000)` ist besser als `interval`, weil es sofort startet (0ms delay)
    // und dann alle 2000ms wiederholt.
    this.statusSubscription = timer(0, 500).pipe(
      // Holen Sie den Job-Status vom Server
      switchMap(() => this.apiService.getImportStatus(jobId)),
      // Fahren Sie fort, bis der Job abgeschlossen oder fehlgeschlagen ist
      takeWhile(job => job.status === 'running' || job.status === 'pending', true)
    ).subscribe({
      next: (job) => {
        this.importLogs = job.logs;
        if (job.total > 0) {
          this.importProgress = Math.round((job.progress / job.total) * 100);
        } else {
          this.importProgress = 0;
        }

        // Wenn der Job abgeschlossen ist, behandeln Sie das Endergebnis
        if (job.status === 'completed') {
          // Zeigen Sie die finale Erfolgsmeldung und Fehler an, falls vorhanden
          let finalMessage = job.result?.message || 'Import erfolgreich abgeschlossen!';
          if (job.result?.errors?.length > 0) {
            finalMessage += ` (${job.result.errors.length} Fehler aufgetreten)`;
          }
          this.notification.success(finalMessage, 7000);
          this.dialogRef.close(true); // Schließen und Erfolg signalisieren
        } else if (job.status === 'failed') {
          if (job.error) {
            this.importLogs = [...this.importLogs, `ERROR: ${job.error}`];
          }
          this.notification.error(`Import fehlgeschlagen: ${job.error}`);
          this.isImporting = false;
        }
      },
      error: (err) => {
        // Fehler beim Abfragen des Status selbst
        this.notification.error('Fehler beim Abrufen des Importstatus.');
        this.isImporting = false;
        console.error('Polling error:', err);
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  get hasUnresolvedAmbiguities(): boolean {
    return this.previewData.some(row => row.needsDecision && !this.isRowResolved(row));
  }

  getComposerSelection(row: any): number | null {
    const res = this.resolutions[row.rowIndex];
    if (res?.createNewComposer) return -1;
    if (res?.composerId) return res.composerId;
    return row.composerMatch?.id || null;
  }

  getTitleSelection(row: any): number | null {
    const res = this.resolutions[row.rowIndex];
    if (res?.createNewPiece) return -1;
    if (res?.pieceId) return res.pieceId;
    return row.titleMatch?.id || null;
  }

  onComposerSelection(rowIndex: number, composerId: number): void {
    if (composerId === -1) {
      this.resolutions[rowIndex] = { ...this.resolutions[rowIndex], composerId: undefined, createNewComposer: true };
    } else {
      this.resolutions[rowIndex] = { ...this.resolutions[rowIndex], composerId, createNewComposer: false };
    }
  }

  onTitleSelection(rowIndex: number, selection: number): void {
    if (selection === -1) {
      this.resolutions[rowIndex] = { ...this.resolutions[rowIndex], pieceId: undefined, createNewPiece: true };
    } else {
      this.resolutions[rowIndex] = { ...this.resolutions[rowIndex], pieceId: selection, createNewPiece: false };
    }
  }

  ngOnDestroy(): void {
    // Beenden Sie die Subscription, wenn der Dialog zerstört wird, um Memory Leaks zu vermeiden.
    if (this.statusSubscription) {
      this.statusSubscription.unsubscribe();
    }
  }

  private initializeResolutions(preview: any[]): void {
    this.resolutions = {};
    preview.forEach(row => {
      const rowIndex = row.rowIndex ?? 0;
      // Initialize with the best match if available
      if (row.composerMatch?.id && row.composerOptions?.length > 0) {
        this.resolutions[rowIndex] = { ...this.resolutions[rowIndex], composerId: row.composerMatch.id };
      }
      if (row.titleMatch?.id && row.titleOptions?.length > 0) {
        this.resolutions[rowIndex] = { ...this.resolutions[rowIndex], pieceId: row.titleMatch.id };
      }
    });
  }

  private isRowResolved(row: any): boolean {
    const res = this.resolutions[row.rowIndex] || {};
    const composerResolved = !row.composerOptions?.length || !!res.composerId || res.createNewComposer === true || !!row.composerMatch?.id;
    const titleResolved = !row.titleOptions?.length || !!res.pieceId || res.createNewPiece === true || !!row.titleMatch?.id;
    return composerResolved && titleResolved;
  }
}
