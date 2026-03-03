import { CommonModule } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MaterialModule } from '@modules/material.module';

export interface PdfFullscreenDialogAudioOption {
  label: string;
  url: string;
}

export interface PdfFullscreenDialogData {
  url: string;
  title?: string;
  allowOpenInNewTab?: boolean;
  /** When false, hides download links and browser PDF toolbar. Defaults to true. */
  allowDownload?: boolean;
  audioOptions?: PdfFullscreenDialogAudioOption[];
  initialAudioUrl?: string;
}

@Component({
  selector: 'app-pdf-fullscreen-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MaterialModule],
  template: `
    <div class="pdf-dialog">
      <header class="pdf-header">
        <h2>{{ data.title || 'PDF Ansicht' }}</h2>
        <div class="audio-toolbar" *ngIf="hasAudioOptions">
          <button
            mat-icon-button
            type="button"
            [attr.aria-label]="isPlaying ? 'Pause' : 'Play'"
            (click)="togglePlay()"
          >
            <mat-icon>{{ isPlaying ? 'pause' : 'play_arrow' }}</mat-icon>
          </button>

          <input
            class="audio-progress"
            type="range"
            min="0"
            [max]="duration || 0"
            step="0.1"
            [value]="currentTime"
            (input)="onSeek($event)"
            [disabled]="!duration"
            aria-label="Fortschritt"
          />

          <span class="audio-time">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span>

          <mat-form-field appearance="outline" class="audio-select">
            <mat-label>Audio</mat-label>
            <mat-select [value]="selectedAudioUrl" (selectionChange)="onAudioSelectionChange($event.value)">
              <mat-option *ngFor="let option of data.audioOptions" [value]="option.url">{{ option.label }}</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
        <div class="spacer"></div>
        <button mat-stroked-button type="button" *ngIf="data.allowOpenInNewTab !== false" (click)="openInNewTab()">
          <mat-icon>open_in_new</mat-icon>
          Neuer Tab
        </button>
        <button mat-icon-button type="button" aria-label="Schließen" (click)="close()">
          <mat-icon>close</mat-icon>
        </button>
      </header>

      <div class="pdf-frame-container">
        <iframe
          class="pdf-frame"
          [src]="safeUrl"
          title="PDF Vollbild"
          loading="eager"
        ></iframe>

        <div class="pdf-mobile-fallback" *ngIf="data.allowDownload !== false">
          <mat-icon>picture_as_pdf</mat-icon>
          <span>PDF wird nicht angezeigt?</span>
          <a mat-stroked-button [href]="data.url" target="_blank" rel="noopener noreferrer">
            <mat-icon>open_in_new</mat-icon>
            In neuem Tab öffnen
          </a>
          <a mat-stroked-button [href]="data.url" [download]="data.title || 'dokument.pdf'">
            <mat-icon>download</mat-icon>
            Herunterladen
          </a>
        </div>
        <div class="pdf-mobile-fallback pdf-mobile-fallback--license" *ngIf="data.allowDownload === false">
          <mat-icon>verified</mat-icon>
          <span>Lizenzierte Ausgabe – nur zur Ansicht</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .pdf-dialog {
      width: 100vw;
      height: 100vh;
      display: grid;
      grid-template-rows: auto 1fr;
      background: #111;
      color: #fff;
    }

    .pdf-header {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid rgba(255,255,255,0.2);
      min-height: 56px;
    }

    .pdf-header h2 {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
    }

    .spacer {
      flex: 1;
    }

    .audio-toolbar {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      min-width: 320px;
      flex: 1 1 520px;
    }

    .audio-progress {
      flex: 1 1 auto;
      min-width: 140px;
      accent-color: #90caf9;
      cursor: pointer;
    }

    .audio-time {
      min-width: 96px;
      font-size: 0.8rem;
      opacity: 0.9;
      white-space: nowrap;
    }

    .audio-select {
      width: 220px;
      margin-left: 0.35rem;
    }

    .audio-select ::ng-deep .mat-mdc-text-field-wrapper {
      background-color: rgba(255,255,255,0.06);
    }

    .audio-select ::ng-deep .mat-mdc-form-field-subscript-wrapper {
      display: none;
    }

    .pdf-frame-container {
      position: relative;
      overflow: hidden;
    }

    .pdf-frame {
      width: 100%;
      height: 100%;
      border: 0;
      background: #fff;
    }

    .pdf-mobile-fallback {
      display: none;
    }

    @media (max-width: 900px) {
      .audio-toolbar {
        order: 3;
        flex: 1 1 100%;
        min-width: 0;
      }

      .audio-select {
        width: 170px;
      }

      .pdf-mobile-fallback {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        padding: 0.5rem 0.75rem;
        background: rgba(0, 0, 0, 0.85);
        color: #fff;
        font-size: 0.85rem;
        flex-wrap: wrap;
      }

      .pdf-mobile-fallback mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        opacity: 0.8;
      }

      .pdf-mobile-fallback a {
        color: #90caf9;
        text-decoration: none;
        white-space: nowrap;
      }
    }
  `]
})
export class PdfFullscreenDialogComponent implements OnInit, OnDestroy {
  safeUrl: SafeResourceUrl;
  audio: HTMLAudioElement | null = null;
  selectedAudioUrl = '';
  isPlaying = false;
  currentTime = 0;
  duration = 0;

  get hasAudioOptions(): boolean {
    return !!this.data.audioOptions?.length;
  }

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: PdfFullscreenDialogData,
    private dialogRef: MatDialogRef<PdfFullscreenDialogComponent>,
    sanitizer: DomSanitizer
  ) {
    // Append #toolbar=0 to hide the browser PDF viewer toolbar (save/edit/annotate buttons)
    const pdfUrl = data.url + (data.url.includes('#') ? '&toolbar=0' : '#toolbar=0');
    this.safeUrl = sanitizer.bypassSecurityTrustResourceUrl(pdfUrl);
  }

  ngOnInit(): void {
    if (!this.data.audioOptions?.length) {
      return;
    }

    const initialMatch = this.data.audioOptions.find(option => option.url === this.data.initialAudioUrl);
    this.selectedAudioUrl = initialMatch?.url || this.data.audioOptions[0].url;
    this.setAudioSource(this.selectedAudioUrl);
  }

  ngOnDestroy(): void {
    this.destroyAudio();
  }

  openInNewTab(): void {
    window.open(this.data.url, '_blank', 'noopener');
  }

  close(): void {
    this.destroyAudio();
    this.dialogRef.close();
  }

  togglePlay(): void {
    if (!this.audio) {
      return;
    }

    if (this.isPlaying) {
      this.audio.pause();
      this.isPlaying = false;
      return;
    }

    this.audio.play()
      .then(() => {
        this.isPlaying = true;
      })
      .catch((error) => {
        console.error('Audio playback failed:', error);
        this.isPlaying = false;
      });
  }

  onSeek(event: Event): void {
    if (!this.audio) {
      return;
    }

    const value = Number((event.target as HTMLInputElement).value);
    if (Number.isNaN(value)) {
      return;
    }

    this.audio.currentTime = value;
    this.currentTime = value;
  }

  onAudioSelectionChange(url: string): void {
    const shouldResume = this.isPlaying;
    this.selectedAudioUrl = url;
    this.setAudioSource(url, shouldResume);
  }

  formatTime(value: number): string {
    if (!Number.isFinite(value) || value < 0) {
      return '00:00';
    }

    const totalSeconds = Math.floor(value);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  private setAudioSource(url: string, autoPlay = false): void {
    this.destroyAudio();

    if (!url) {
      return;
    }

    this.currentTime = 0;
    this.duration = 0;
    this.isPlaying = false;
    this.audio = new Audio(url);
    this.audio.preload = 'metadata';
    this.audio.addEventListener('loadedmetadata', this.onLoadedMetadata);
    this.audio.addEventListener('timeupdate', this.onTimeUpdate);
    this.audio.addEventListener('ended', this.onEnded);

    if (autoPlay) {
      this.audio.play()
        .then(() => {
          this.isPlaying = true;
        })
        .catch((error) => {
          console.error('Audio playback failed:', error);
          this.isPlaying = false;
        });
    }
  }

  private destroyAudio(): void {
    if (!this.audio) {
      return;
    }

    this.audio.pause();
    this.audio.removeEventListener('loadedmetadata', this.onLoadedMetadata);
    this.audio.removeEventListener('timeupdate', this.onTimeUpdate);
    this.audio.removeEventListener('ended', this.onEnded);
    this.audio = null;
    this.isPlaying = false;
  }

  private onLoadedMetadata = (): void => {
    if (!this.audio) {
      return;
    }
    this.duration = Number.isFinite(this.audio.duration) ? this.audio.duration : 0;
  };

  private onTimeUpdate = (): void => {
    if (!this.audio) {
      return;
    }
    this.currentTime = this.audio.currentTime;
  };

  private onEnded = (): void => {
    this.isPlaying = false;
    this.currentTime = 0;
    if (this.audio) {
      this.audio.currentTime = 0;
    }
  };
}
