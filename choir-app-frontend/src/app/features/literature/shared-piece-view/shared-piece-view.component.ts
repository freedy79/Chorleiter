import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { MaterialModule } from '@modules/material.module';
import { Piece } from '@core/models/piece';
import { PieceLink } from '@core/models/piece-link';
import { PieceService } from '@core/services/piece.service';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';
import { AudioPlayerComponent } from '@shared/components/audio-player/audio-player.component';

@Component({
  selector: 'app-shared-piece-view',
  standalone: true,
  imports: [
    CommonModule,
    MaterialModule,
    AudioPlayerComponent
  ],
  templateUrl: './shared-piece-view.component.html',
  styleUrls: ['./shared-piece-view.component.scss'],
  host: {
    'style': 'display: flex; flex-direction: column; flex: 1; width: 100%; min-height: 100vh;'
  }
})
export class SharedPieceViewComponent implements OnInit {
  piece?: Piece;
  pieceImage: string | null = null;
  fileLinks: (PieceLink & { isPdf: boolean; size?: number; isMp3?: boolean })[] = [];
  externalLinks: PieceLink[] = [];
  notFound = false;

  constructor(
    private route: ActivatedRoute,
    private pieceService: PieceService,
    private http: HttpClient,
    private titleService: Title
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token');
    //console.log('SharedPieceView - Token from URL:', token);
    if (token) {
      this.loadSharedPiece(token);
    } else {
      console.warn('No token found in route parameters');
      this.notFound = true;
    }
  }

  private loadSharedPiece(token: string): void {
    //console.log('Loading shared piece with token:', token);
    this.pieceService.getPieceByShareToken(token).subscribe({
      next: (p: any) => {
        //console.log('Shared piece loaded successfully:', p);
        this.piece = p;

        // Set page title
        const title = p.title ? `${p.title} - NAK Chorleiter` : 'NAK Chorleiter';
        this.titleService.setTitle(title);

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
        console.error('Error details:', err.status, err.message);
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
}
