import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MaterialModule } from '@modules/material.module';
import { Piece } from '@core/models/piece';
import { PieceLink } from '@core/models/piece-link';
import { PieceService } from '@core/services/piece.service';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-shared-piece-view',
  standalone: true,
  imports: [
    CommonModule,
    MaterialModule
  ],
  templateUrl: './shared-piece-view.component.html',
  styleUrls: ['./shared-piece-view.component.scss']
})
export class SharedPieceViewComponent implements OnInit, OnDestroy {
  piece?: Piece;
  pieceImage: string | null = null;
  fileLinks: (PieceLink & { isPdf: boolean; size?: number; isMp3?: boolean })[] = [];
  externalLinks: PieceLink[] = [];
  notFound = false;

  // Audio player state
  audioPlayers: Map<number, HTMLAudioElement> = new Map();
  currentPlayingLinkId: number | null = null;
  audioProgress: Map<number, number> = new Map();
  audioDuration: Map<number, number> = new Map();
  audioCurrentTime: Map<number, number> = new Map();

  constructor(
    private route: ActivatedRoute,
    private pieceService: PieceService,
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token');
    if (token) {
      this.loadSharedPiece(token);
    }
  }

  ngOnDestroy(): void {
    this.stopAllAudio();
    this.audioPlayers.clear();
  }

  private loadSharedPiece(token: string): void {
    this.pieceService.getPieceByShareToken(token).subscribe({
      next: (p: any) => {
        this.piece = p;
        if (p.imageIdentifier) {
          this.pieceService.getPieceImage(p.id).subscribe((img: any) => this.pieceImage = img);
        }
        this.fileLinks = (p.links?.filter((l: any) => l.type === 'FILE_DOWNLOAD') || []).map((l: any) => ({
          ...l,
          isPdf: /\.pdf$/i.test(l.url) || /\.pdf$/i.test(l.description),
          isMp3: /\.mp3$/i.test(l.url) || /\.mp3$/i.test(l.description)
        }));
        this.fileLinks.forEach(link => {
          const url = this.getLinkUrl(link);
          this.http.head(url, { observe: 'response', responseType: 'blob' }).subscribe(res => {
            const size = Number(res.headers.get('Content-Length'));
            if (!isNaN(size)) {
              link.size = size;
            }
          });
        });
        this.externalLinks = p.links?.filter((l: any) => l.type === 'EXTERNAL') || [];
      },
      error: (err: any) => {
        console.error('Error loading shared piece:', err);
        this.notFound = true;
      }
    });
  }

  formatDuration(sec: number): string {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  getLinkUrl(link: PieceLink): string {
    if (/^https?:\/\//i.test(link.url)) {
      return link.url;
    }
    const apiBase = environment.apiUrl.replace(/\/api\/?$/, '');
    const path = link.url.startsWith('/') ? link.url : `/${link.url}`;
    const fullPath = path.startsWith('/api/') ? path : `/api${path}`;
    return `${apiBase}${fullPath}`;
  }

  formatFileSize(bytes: number): string {
    const kb = bytes / 1024;
    if (kb < 1024) {
      return `${kb.toFixed(1)} kB`;
    }
    return `${(kb / 1024).toFixed(1)} MB`;
  }

  formatComposerYears(composer: any): string {
    if (!composer || !composer.birthYear) {
      return '';
    }
    if (composer.deathYear) {
      return ` (${composer.birthYear}-${composer.deathYear})`;
    }
    return ` (${composer.birthYear})`;
  }

  // Audio player methods
  playAudio(link: PieceLink & { isMp3?: boolean }): void {
    if (!link.id) return;

    this.stopAllAudio();

    let audio = this.audioPlayers.get(link.id);

    if (!audio) {
      audio = new Audio(this.getLinkUrl(link));
      this.audioPlayers.set(link.id, audio);

      audio.addEventListener('timeupdate', () => this.onAudioTimeUpdate(link.id!, audio!));
      audio.addEventListener('loadedmetadata', () => this.onAudioLoadedMetadata(link.id!, audio!));
      audio.addEventListener('ended', () => this.onAudioEnded(link.id!));
      audio.addEventListener('error', (e) => {
        console.error('Audio playback error:', e);
        this.snackBar.open('Fehler beim Abspielen der Audio-Datei', 'OK', { duration: 3000 });
      });
    }

    this.currentPlayingLinkId = link.id;
    audio.play().catch(err => {
      console.error('Play error:', err);
      this.snackBar.open('Fehler beim Abspielen', 'OK', { duration: 3000 });
    });
  }

  pauseAudio(linkId: number): void {
    const audio = this.audioPlayers.get(linkId);
    if (audio) {
      audio.pause();
      this.currentPlayingLinkId = null;
    }
  }

  stopAllAudio(): void {
    this.audioPlayers.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
    this.currentPlayingLinkId = null;
    this.audioProgress.clear();
    this.audioCurrentTime.clear();
  }

  private onAudioTimeUpdate(linkId: number, audio: HTMLAudioElement): void {
    if (audio.duration) {
      const progress = (audio.currentTime / audio.duration) * 100;
      this.audioProgress.set(linkId, progress);
      this.audioCurrentTime.set(linkId, audio.currentTime);
    }
  }

  private onAudioLoadedMetadata(linkId: number, audio: HTMLAudioElement): void {
    this.audioDuration.set(linkId, audio.duration);
  }

  private onAudioEnded(linkId: number): void {
    this.currentPlayingLinkId = null;
    this.audioProgress.set(linkId, 0);
    this.audioCurrentTime.set(linkId, 0);
  }

  isAudioPlaying(linkId: number): boolean {
    return this.currentPlayingLinkId === linkId;
  }
}
