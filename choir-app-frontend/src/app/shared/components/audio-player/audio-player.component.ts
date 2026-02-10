import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { NotificationService } from '@core/services/notification.service';

@Component({
  selector: 'app-audio-player',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './audio-player.component.html',
  styleUrls: ['./audio-player.component.scss']
})
export class AudioPlayerComponent implements OnInit, OnDestroy {
  @Input() title = '';
  @Input() url = '';
  @Input() downloadName = '';

  private audio: HTMLAudioElement | null = null;
  isPlaying = false;
  progress = 0;
  duration = 0;
  currentTime = 0;

  constructor(private notification: NotificationService) {}

  ngOnInit(): void {
    this.initAudio();
  }

  ngOnDestroy(): void {
    this.destroyAudio();
  }

  private initAudio(): void {
    if (!this.url) return;

    this.audio = new Audio(this.url);
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
      this.audio.play().catch(err => {
        console.error('Play error:', err);
        this.notification.error('Fehler beim Abspielen');
      });
      this.isPlaying = true;
    }
  }

  formatDuration(sec: number): string {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }
}
