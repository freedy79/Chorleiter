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
import { DurationPipe } from '@shared/pipes/duration.pipe';
import { ComposerYearsPipe } from '@shared/pipes/composer-years.pipe';
import { FileSizePipe } from '@shared/pipes/file-size.pipe';

type DisplayFileLink = PieceLink & {
  isPdf: boolean;
  size?: number;
  isMp3?: boolean;
  isImage?: boolean;
  isCapella?: boolean;
  isMuseScore?: boolean;
};

type FileLinkGroup = {
  key: string;
  label: string;
  links: DisplayFileLink[];
};

@Component({
  selector: 'app-shared-piece-view',
  standalone: true,
  imports: [
    CommonModule,
    MaterialModule,
    AudioPlayerComponent,
    DurationPipe,
    ComposerYearsPipe,
    FileSizePipe
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
  fileLinks: DisplayFileLink[] = [];
  groupedFileLinks: FileLinkGroup[] = [];
  externalLinks: PieceLink[] = [];
  notFound = false;

  get hasVisibleMp3Player(): boolean {
    return this.fileLinks.some(link => !!link.isMp3);
  }

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
          isPdf: (typeof l.url === 'string' && /\.pdf$/i.test(l.url)) || (typeof l.description === 'string' && /\.pdf$/i.test(l.description)),
          isMp3: (typeof l.url === 'string' && /\.mp3$/i.test(l.url)) || (typeof l.description === 'string' && /\.mp3$/i.test(l.description)),
          isImage: (typeof l.url === 'string' && /\.(jpe?g|png|webp)$/i.test(l.url)) || (typeof l.description === 'string' && /\.(jpe?g|png|webp)$/i.test(l.description)),
          isCapella: (typeof l.url === 'string' && /\.(cap|capx)$/i.test(l.url)) || (typeof l.description === 'string' && /\.(cap|capx)$/i.test(l.description)),
          isMuseScore: (typeof l.url === 'string' && /\.(musicxml|mxl)$/i.test(l.url)) || (typeof l.description === 'string' && /\.(musicxml|mxl)$/i.test(l.description))
        }));
        this.groupedFileLinks = this.groupAndSortFileLinks(this.fileLinks);
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

  getLinkUrl(link: PieceLink | any): string {
    // Defensive type checking for runtime safety
    if (!link) return '';
    const url = link.url;
    if (!url || typeof url !== 'string') return '';

    // Check if it's an absolute URL
    if (/^https?:\/\//i.test(url)) {
      return url;
    }

    // Build relative URL path
    const apiUrlStr = typeof environment.apiUrl === 'string' ? environment.apiUrl : '';
    const apiBase = apiUrlStr.replace(/\/api\/?$/, '');
    const path = url.startsWith('/') ? url : `/${url}`;
    const fullPath = path.startsWith('/api/') ? path : `/api${path}`;
    return `${apiBase}${fullPath}`;
  }

  private groupAndSortFileLinks(links: DisplayFileLink[]): FileLinkGroup[] {
    const groups = new Map<string, FileLinkGroup>();

    links.forEach((link) => {
      const format = this.getFileFormat(link);
      if (!groups.has(format.key)) {
        groups.set(format.key, { key: format.key, label: format.label, links: [] });
      }
      groups.get(format.key)!.links.push(link);
    });

    const formatOrder = ['pdf', 'audio', 'image', 'notation', 'other'];

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        links: [...group.links].sort((a, b) => this.compareFileLinks(a, b))
      }))
      .sort((a, b) => {
        const aIdx = formatOrder.indexOf(a.key);
        const bIdx = formatOrder.indexOf(b.key);
        const safeA = aIdx === -1 ? Number.MAX_SAFE_INTEGER : aIdx;
        const safeB = bIdx === -1 ? Number.MAX_SAFE_INTEGER : bIdx;
        return safeA - safeB || a.label.localeCompare(b.label, 'de');
      });
  }

  private compareFileLinks(a: DisplayFileLink, b: DisplayFileLink): number {
    const voiceRankA = this.getVoiceSortRank(this.getDisplayText(a));
    const voiceRankB = this.getVoiceSortRank(this.getDisplayText(b));

    if (voiceRankA !== voiceRankB) {
      return voiceRankA - voiceRankB;
    }

    return this.getDisplayText(a).localeCompare(this.getDisplayText(b), 'de', { sensitivity: 'base' });
  }

  private getFileFormat(link: DisplayFileLink): { key: string; label: string } {
    if (link.isPdf) {
      return { key: 'pdf', label: 'Noten (PDF)' };
    }
    if (link.isMp3) {
      return { key: 'audio', label: 'Audio-Dateien (MP3)' };
    }
    if (link.isImage) {
      return { key: 'image', label: 'Bilder/Scans' };
    }
    if (link.isCapella || link.isMuseScore) {
      return { key: 'notation', label: 'Notensatz (cap, capx, musicxml, mxl)' };
    }
    return { key: 'other', label: 'Sonstige Dateien' };
  }

  private getDisplayText(link: DisplayFileLink): string {
    return (link.description || link.downloadName || link.url || '').trim();
  }

  private getVoiceSortRank(text: string): number {
    if (!text) {
      return 99;
    }

    const normalized = text.toLowerCase();
    const satbPattern = /(^|[\s_.\-()])(satb|s\s*a\s*t\s*b)($|[\s_.\-()])/i;
    if (satbPattern.test(normalized)) {
      return 0;
    }

    const voices: Array<{ regex: RegExp; rank: number }> = [
      { regex: /(^|[\s_.\-()])(s|sopran)($|[\s_.\-()])/i, rank: 1 },
      { regex: /(^|[\s_.\-()])(a|alt|alto)($|[\s_.\-()])/i, rank: 2 },
      { regex: /(^|[\s_.\-()])(t|tenor)($|[\s_.\-()])/i, rank: 3 },
      { regex: /(^|[\s_.\-()])(b|bass)($|[\s_.\-()])/i, rank: 4 }
    ];

    for (const voice of voices) {
      if (voice.regex.test(normalized)) {
        return voice.rank;
      }
    }

    return 99;
  }
}
