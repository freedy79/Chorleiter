import { Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '@core/services/notification.service';
import { formatSecondsAsDuration } from '@shared/util/duration.utils';
import { AudioMarker } from '@core/models/audio-marker';

@Component({
  selector: 'app-audio-player',
  standalone: true,
  imports: [CommonModule, MaterialModule, FormsModule],
  templateUrl: './audio-player.component.html',
  styleUrls: ['./audio-player.component.scss'],
  host: {
    '[class.compact]': 'compact',
    '[style.--player-accent]': 'accentColor || null'
  }
})
export class AudioPlayerComponent implements OnInit, OnChanges, OnDestroy {
  /** MP3 file title */
  @Input() title = '';
  /** URL of the audio file */
  @Input() url = '';
  /** Filename used for the download attribute */
  @Input() downloadName = '';
  /** Array of markers displayed on the seek bar and as chips */
  @Input() markers: AudioMarker[] = [];
  /** Whether the user can create/edit/delete markers */
  @Input() canEditMarkers = false;
  /** Show the current / total time display (default: true) */
  @Input() showTime = true;
  /** Show the progress / seek bar (default: true) */
  @Input() showProgress = true;
  /** Show the download button (default: true) */
  @Input() showDownload = true;
  /** CSS accent colour applied via custom property --player-accent */
  @Input() accentColor = '';
  /** Compact layout for narrow containers */
  @Input() compact = false;

  @Output() playbackEnded = new EventEmitter<void>();
  @Output() markerCreate = new EventEmitter<{ timeSec: number; label: string }>();
  @Output() markerDelete = new EventEmitter<AudioMarker>();
  @Output() markerUpdate = new EventEmitter<AudioMarker>();

  private audio: HTMLAudioElement | null = null;
  isPlaying = false;
  progress = 0;
  duration = 0;
  currentTime = 0;

  // Marker UI state
  showAddMarkerInput = false;
  newMarkerLabel = '';
  editingMarker: AudioMarker | null = null;
  editingMarkerLabel = '';

  constructor(
    private notification: NotificationService,
    private hostRef: ElementRef<HTMLElement>
  ) {}

  /** Observed width of the host element for responsive layout */
  private resizeObserver: ResizeObserver | null = null;
  hostWidth = 0;

  ngOnInit(): void {
    this.initAudio();
    this.setupResizeObserver();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['url'] && !changes['url'].firstChange) {
      this.initAudio();
    }
  }

  ngOnDestroy(): void {
    this.destroyAudio();
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }

  private setupResizeObserver(): void {
    if (typeof ResizeObserver === 'undefined') return;
    this.resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        this.hostWidth = entry.contentRect.width;
      }
    });
    this.resizeObserver.observe(this.hostRef.nativeElement);
  }

  private initAudio(): void {
    this.destroyAudio();
    this.progress = 0;
    this.duration = 0;
    this.currentTime = 0;
    this.isPlaying = false;

    if (!this.url) return;

    this.audio = new Audio(this.url);
    this.audio.preload = 'metadata';
    this.audio.addEventListener('timeupdate', this.onTimeUpdate);
    this.audio.addEventListener('loadedmetadata', this.onLoadedMetadata);
    this.audio.addEventListener('ended', this.onEnded);
    this.audio.addEventListener('error', this.onError);
  }

  private destroyAudio(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.removeEventListener('timeupdate', this.onTimeUpdate);
      this.audio.removeEventListener('loadedmetadata', this.onLoadedMetadata);
      this.audio.removeEventListener('ended', this.onEnded);
      this.audio.removeEventListener('error', this.onError);
      this.audio = null;
    }
  }

  private onTimeUpdate = (): void => {
    if (this.audio && this.audio.duration) {
      this.progress = (this.audio.currentTime / this.audio.duration) * 100;
      this.currentTime = this.audio.currentTime;
    }
  };

  private onLoadedMetadata = (): void => {
    if (this.audio) {
      this.duration = this.audio.duration;
    }
  };

  private onEnded = (): void => {
    this.isPlaying = false;
    this.progress = 0;
    this.currentTime = 0;
    this.playbackEnded.emit();
  };

  private onError = (e: Event): void => {
    console.error('Audio playback error:', e);
    this.notification.error('Fehler beim Abspielen der Audio-Datei');
  };

  togglePlay(): void {
    if (!this.audio) return;

    if (this.isPlaying) {
      this.audio.pause();
      this.isPlaying = false;
    } else {
      this.audio.play().then(() => {
        this.isPlaying = true;
      }).catch(err => {
        console.error('Play error:', err);
        this.notification.error('Fehler beim Abspielen');
        this.isPlaying = false;
      });
    }
  }

  onSeek(event: Event): void {
    if (!this.audio) return;
    const value = Number((event.target as HTMLInputElement).value);
    if (Number.isNaN(value)) return;
    this.audio.currentTime = value;
    this.currentTime = value;
    this.progress = this.duration ? (value / this.duration) * 100 : 0;
  }

  formatDuration(sec: number): string {
    return formatSecondsAsDuration(sec);
  }

  // --- Marker methods ---

  get sortedMarkers(): AudioMarker[] {
    return [...(this.markers || [])].sort((a, b) => a.timeSec - b.timeSec);
  }

  seekToMarker(marker: AudioMarker): void {
    if (!this.audio) return;
    this.audio.currentTime = marker.timeSec;
    this.currentTime = marker.timeSec;
    this.progress = this.duration ? (marker.timeSec / this.duration) * 100 : 0;
  }

  getMarkerPosition(marker: AudioMarker): number {
    if (!this.duration) return 0;
    return (marker.timeSec / this.duration) * 100;
  }

  openAddMarker(): void {
    this.showAddMarkerInput = true;
    this.newMarkerLabel = '';
  }

  cancelAddMarker(): void {
    this.showAddMarkerInput = false;
    this.newMarkerLabel = '';
  }

  confirmAddMarker(): void {
    const label = this.newMarkerLabel.trim();
    if (!label) return;
    this.markerCreate.emit({ timeSec: this.currentTime, label });
    this.showAddMarkerInput = false;
    this.newMarkerLabel = '';
  }

  startEditMarker(marker: AudioMarker, event: Event): void {
    event.stopPropagation();
    this.editingMarker = marker;
    this.editingMarkerLabel = marker.label;
  }

  cancelEditMarker(): void {
    this.editingMarker = null;
    this.editingMarkerLabel = '';
  }

  confirmEditMarker(): void {
    if (!this.editingMarker) return;
    const label = this.editingMarkerLabel.trim();
    if (!label) return;
    this.markerUpdate.emit({ ...this.editingMarker, label });
    this.editingMarker = null;
    this.editingMarkerLabel = '';
  }

  removeMarker(marker: AudioMarker, event: Event): void {
    event.stopPropagation();
    this.markerDelete.emit(marker);
  }
}
