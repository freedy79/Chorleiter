import { Component, Inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription, interval, timer } from 'rxjs';
import { switchMap, takeWhile, tap } from 'rxjs/operators';
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

  // Für den Import-Fortschritt
  importLogs: string[] = [];
  importProgress = 0;
  private statusSubscription?: Subscription;

  previewColumns: string[] = ['nummer', 'titel', 'komponist', 'kategorie'];

  constructor(
    public dialogRef: MatDialogRef<ImportDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { collectionId: number, collectionTitle: string },
    private apiService: ApiService,
    private snackBar: MatSnackBar
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
        this.isLoading = false;
      },
      error: (err) => {
        const detail = err.error?.detail ? ` - ${err.error.detail}` : '';
        const hint = err.error?.hint ? ` (${err.error.hint})` : '';
        this.snackBar.open(
          `Fehler beim Laden der Vorschau: ${err.error?.message || 'Unbekannter Fehler'}${detail}${hint}`,
          'Schließen'
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

    this.apiService.startCollectionCsvImport(this.data.collectionId, this.selectedFile).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.pollStatus(response.jobId);
      },
      error: (err) => {
        const detail = err.error?.detail ? ` - ${err.error.detail}` : '';
        const hint = err.error?.hint ? ` (${err.error.hint})` : '';
        this.snackBar.open(
          `Import konnte nicht gestartet werden: ${err.error?.message || 'Unbekannter Fehler'}${detail}${hint}`,
          'Schließen'
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
      // Loggen Sie den Job-Status zum Debuggen
      tap(job => console.log('Polling status:', job)),
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
          this.snackBar.open(finalMessage, 'OK', { duration: 7000 });
          this.dialogRef.close(true); // Schließen und Erfolg signalisieren
        } else if (job.status === 'failed') {
          if (job.error) {
            this.importLogs = [...this.importLogs, `ERROR: ${job.error}`];
          }
          this.snackBar.open(`Import fehlgeschlagen: ${job.error}`, 'Schließen');
          this.isImporting = false;
        }
      },
      error: (err) => {
        // Fehler beim Abfragen des Status selbst
        this.snackBar.open('Fehler beim Abrufen des Importstatus.', 'Schließen');
        this.isImporting = false;
        console.error('Polling error:', err);
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  ngOnDestroy(): void {
    // Beenden Sie die Subscription, wenn der Dialog zerstört wird, um Memory Leaks zu vermeiden.
    if (this.statusSubscription) {
      this.statusSubscription.unsubscribe();
    }
  }
}
