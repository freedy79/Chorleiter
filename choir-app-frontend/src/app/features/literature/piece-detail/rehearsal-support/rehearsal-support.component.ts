import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from '@modules/material.module';
import { MatDialog } from '@angular/material/dialog';
import { NotificationService } from '@core/services/notification.service';
import { MidiPlaybackService } from './services/midi-playback.service';
import {
  RehearsalData,
  MidiFileInfo,
  PlaybackState,
  TrackMixerState
} from './models/rehearsal-data.types';
import { RehearsalDataEditorDialogComponent } from './rehearsal-data-editor-dialog.component';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-rehearsal-support',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule],
  templateUrl: './rehearsal-support.component.html',
  styleUrls: ['./rehearsal-support.component.scss']
})
export class RehearsalSupportComponent implements OnInit, OnDestroy {
  @Input() pieceId?: number;

  midiFileInfo: MidiFileInfo | null = null;
  rehearsalData: RehearsalData = {
    ppq: 480,
    measureToTick: {},
    pageToTick: {},
    voicing: {}
  };

  playbackState: PlaybackState = {
    isPlaying: false,
    isPaused: false,
    tempoFactor: 1.0,
    transpose: 0,
    currentTick: 0,
    currentTime: 0,
    selectedMeasure: null,
    selectedPage: null
  };

  // UI state
  selectedMidiFile: File | null = null;
  isLoading = false;
  errorMessage: string | null = null;
  audioInitialized = false;

  // Track mixer (fallback when no voicing)
  trackMixers: Map<number, TrackMixerState> = new Map();

  private updateSubscription?: Subscription;

  constructor(
    private playbackService: MidiPlaybackService,
    private dialog: MatDialog,
    private notification: NotificationService
  ) {}

  ngOnInit(): void {
    // Update playback state periodically
    this.updateSubscription = interval(100).subscribe(() => {
      if (this.playbackService.getPlaybackState().isPlaying) {
        this.playbackState = this.playbackService.getPlaybackState();
      }
    });
  }

  ngOnDestroy(): void {
    this.updateSubscription?.unsubscribe();
    this.playbackService.dispose();
  }

  async onMidiFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    if (!file.name.match(/\.(mid|midi)$/i)) {
      this.errorMessage = 'Bitte wählen Sie eine MIDI-Datei (.mid oder .midi)';
      return;
    }

    this.selectedMidiFile = file;
    this.isLoading = true;
    this.errorMessage = null;

    try {
      await this.playbackService.initializeAudio();
      this.audioInitialized = true;

      this.midiFileInfo = await this.playbackService.loadMidiFile(file);
      this.trackMixers = this.playbackService.getAllTrackMixers();

      // Initialize rehearsal data with ppq from MIDI
      this.rehearsalData.ppq = this.midiFileInfo.ppq;

      this.notification.success('MIDI-Datei geladen');
    } catch (error) {
      console.error('Error loading MIDI:', error);
      this.errorMessage = 'Fehler beim Laden der MIDI-Datei: ' + error;
    } finally {
      this.isLoading = false;
    }
  }

  async onPlay(): Promise<void> {
    try {
      if (!this.audioInitialized) {
        await this.playbackService.initializeAudio();
        this.audioInitialized = true;
      }
      await this.playbackService.play();
      this.playbackState = this.playbackService.getPlaybackState();
    } catch (error) {
      this.errorMessage = 'Fehler beim Abspielen: ' + error;
    }
  }

  onPause(): void {
    this.playbackService.pause();
    this.playbackState = this.playbackService.getPlaybackState();
  }

  onStop(): void {
    this.playbackService.stop();
    this.playbackState = this.playbackService.getPlaybackState();
  }

  onTempoChange(factor: number): void {
    this.playbackService.setTempoFactor(factor);
    this.playbackState = this.playbackService.getPlaybackState();
  }

  onTransposeChange(semitones: number): void {
    this.playbackService.setTranspose(semitones);
    this.playbackState = this.playbackService.getPlaybackState();
  }

  onJumpToMeasure(): void {
    if (!this.playbackState.selectedMeasure || !this.rehearsalData.measureToTick[this.playbackState.selectedMeasure]) {
      return;
    }
    const tick = this.rehearsalData.measureToTick[this.playbackState.selectedMeasure];
    this.playbackService.jumpToTick(tick);
    this.playbackState = this.playbackService.getPlaybackState();
  }

  onJumpToPage(): void {
    if (!this.playbackState.selectedPage || !this.rehearsalData.pageToTick[this.playbackState.selectedPage]) {
      return;
    }
    const tick = this.rehearsalData.pageToTick[this.playbackState.selectedPage];
    this.playbackService.jumpToTick(tick);
    this.playbackState = this.playbackService.getPlaybackState();
  }

  onTrackMixerChange(trackIndex: number, changes: Partial<TrackMixerState>): void {
    this.playbackService.setTrackMixer(trackIndex, changes);
    this.trackMixers = this.playbackService.getAllTrackMixers();
  }

  onToggleMute(trackIndex: number): void {
    const current = this.trackMixers.get(trackIndex);
    if (current) {
      this.onTrackMixerChange(trackIndex, { muted: !current.muted });
    }
  }

  onToggleSolo(trackIndex: number): void {
    const current = this.trackMixers.get(trackIndex);
    if (current) {
      this.onTrackMixerChange(trackIndex, { solo: !current.solo });
    }
  }

  onVolumeChange(trackIndex: number, volume: number): void {
    this.onTrackMixerChange(trackIndex, { volume });
  }

  openEditRehearsalData(): void {
    const dialogRef = this.dialog.open(RehearsalDataEditorDialogComponent, {
      width: '90vw',
      maxWidth: '1000px',
      data: {
        rehearsalData: JSON.parse(JSON.stringify(this.rehearsalData)),
        midiFileInfo: this.midiFileInfo
      }
    });

    dialogRef.afterClosed().subscribe((result: RehearsalData | null) => {
      if (result) {
        this.rehearsalData = result;
        this.notification.success('Proben-Daten aktualisiert');
        // TODO: Save to backend if needed
      }
    });
  }

  autoGenerateMeasureMapping(): void {
    if (!this.midiFileInfo) return;

    // Set ppq from MIDI
    this.rehearsalData.ppq = this.midiFileInfo.ppq;

    // Try to generate measure mapping
    if (this.midiFileInfo.timeSignatures.length > 0) {
      const ts = this.midiFileInfo.timeSignatures[0];
      const ticksPerMeasure = (this.midiFileInfo.ppq * 4 * ts.numerator) / ts.denominator;

      const measureCount = Math.floor(this.midiFileInfo.durationTicks / ticksPerMeasure);

      this.rehearsalData.measureToTick = {};
      for (let i = 1; i <= measureCount; i++) {
        this.rehearsalData.measureToTick[i.toString()] = Math.floor((i - 1) * ticksPerMeasure);
      }

      this.notification.success(`${measureCount} Takte generiert (${ts.numerator}/${ts.denominator})`, 4000);
    } else {
      this.notification.info('ppq gesetzt. Taktart nicht gefunden - bitte manuell eingeben.', 4000);
    }
  }

  markCurrentAsMeasure(): void {
    const measureNumber = prompt('Taktnummer:');
    if (measureNumber) {
      this.rehearsalData.measureToTick[measureNumber] = this.playbackState.currentTick;
      this.notification.success(`Takt ${measureNumber} markiert`, 2000);
    }
  }

  markCurrentAsPage(): void {
    const pageNumber = prompt('Seitennummer:');
    if (pageNumber) {
      this.rehearsalData.pageToTick[pageNumber] = this.playbackState.currentTick;
      this.notification.success(`Seite ${pageNumber} markiert`, 2000);
    }
  }

  get measureKeys(): string[] {
    return Object.keys(this.rehearsalData.measureToTick).sort((a, b) => parseInt(a) - parseInt(b));
  }

  get pageKeys(): string[] {
    return Object.keys(this.rehearsalData.pageToTick).sort((a, b) => parseInt(a) - parseInt(b));
  }

  get voiceNames(): string[] {
    return Object.keys(this.rehearsalData.voicing);
  }

  getTrackForVoice(voiceName: string): number | undefined {
    return this.rehearsalData.voicing[voiceName];
  }

  getVoiceMixer(voiceName: string): TrackMixerState | undefined {
    const trackIndex = this.getTrackForVoice(voiceName);
    if (trackIndex !== undefined) {
      return this.trackMixers.get(trackIndex - 1); // voicing is 1-based
    }
    return undefined;
  }

  onVoiceMixerChange(voiceName: string, changes: Partial<TrackMixerState>): void {
    const trackIndex = this.getTrackForVoice(voiceName);
    if (trackIndex !== undefined) {
      this.onTrackMixerChange(trackIndex - 1, changes); // voicing is 1-based
    }
  }

  formatTick(tick: number): string {
    if (!this.midiFileInfo) return tick.toString();
    const measures = Math.floor(tick / (this.midiFileInfo.ppq * 4)) + 1;
    return `${tick} (≈ T.${measures})`;
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}
