import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { NotificationService } from '@core/services/notification.service';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { Subscription, timer } from 'rxjs';
import { switchMap, takeWhile } from 'rxjs/operators';

@Component({
  selector: 'app-event-import-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule],
  templateUrl: './event-import-dialog.component.html',
  styleUrls: ['./event-import-dialog.component.scss']
})
export class EventImportDialogComponent implements OnDestroy {
  selectedFile: File | null = null;
  previewData: any[] = [];
  isLoading = false;
  isImporting = false;
  importLogs: string[] = [];
  importProgress = 0;
  eventType: 'REHEARSAL' | 'SERVICE' = 'SERVICE';
  private statusSubscription?: Subscription;

  previewColumns: string[] = ['reference', 'title', 'date'];

  constructor(
    private dialogRef: MatDialogRef<EventImportDialogComponent>,
    private apiService: ApiService,
    private notification: NotificationService
  ) {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.previewData = [];
      this.isImporting = false;
      this.getPreview();
    }
  }

  getPreview(): void {
    if (!this.selectedFile) return;
    this.isLoading = true;
    this.apiService.uploadEventCsv(this.selectedFile, this.eventType, 'preview').subscribe({
      next: preview => { this.previewData = preview; this.isLoading = false; },
      error: err => { this.notification.error(`Fehler beim Laden der Vorschau: ${err.error?.message || 'Unbekannter Fehler'}`); this.isLoading = false; }
    });
  }

  onImport(): void {
    if (!this.selectedFile) return;
    this.isLoading = true;
    this.isImporting = true;
    this.importLogs = ['Importvorgang wird gestartet...'];
    this.importProgress = 0;

    this.apiService.startEventCsvImport(this.selectedFile, this.eventType).subscribe({
      next: res => { this.isLoading = false; this.pollStatus(res.jobId); },
      error: err => { this.notification.error(`Import konnte nicht gestartet werden: ${err.error?.message || 'Unbekannter Fehler'}`); this.isLoading = false; this.isImporting = false; }
    });
  }

  private pollStatus(jobId: string): void {
    if (this.statusSubscription) this.statusSubscription.unsubscribe();

    this.statusSubscription = timer(0, 500).pipe(
      switchMap(() => this.apiService.getImportStatus(jobId)),
      takeWhile(job => job.status === 'running' || job.status === 'pending', true)
    ).subscribe({
      next: job => {
        this.importLogs = job.logs;
        if (job.total > 0) {
          this.importProgress = Math.round((job.progress / job.total) * 100);
        } else {
          this.importProgress = 0;
        }
        if (job.status === 'completed') {
          this.notification.success(job.result?.message || 'Import erfolgreich abgeschlossen!');
          this.dialogRef.close(true);
        } else if (job.status === 'failed') {
          this.notification.error(`Import fehlgeschlagen: ${job.error}`);
          this.isImporting = false;
        }
      },
      error: () => { this.notification.error('Fehler beim Abrufen des Importstatus.'); this.isImporting = false; }
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  ngOnDestroy(): void {
    if (this.statusSubscription) this.statusSubscription.unsubscribe();
  }
}
