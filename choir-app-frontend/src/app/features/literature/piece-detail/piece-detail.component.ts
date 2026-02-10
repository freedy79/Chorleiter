import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { RouterModule } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { MaterialModule } from '@modules/material.module';
import { EventTypeLabelPipe } from '@shared/pipes/event-type-label.pipe';
import { ApiService } from '@core/services/api.service';
import { NotificationService } from '@core/services/notification.service';
import { Piece, PieceNote } from '@core/models/piece';
import { PieceLink } from '@core/models/piece-link';
import { AuthService } from '@core/services/auth.service';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { PieceDialogComponent } from '../piece-dialog/piece-dialog.component';
import { PieceReportDialogComponent } from '../piece-report-dialog/piece-report-dialog.component';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';
import { LibraryItem } from '@core/models/library-item';
import { LibraryItemInfoDialogComponent } from '../../library/library-item-info-dialog.component';
import { PureDatePipe } from '@shared/pipes/pure-date.pipe';
import { combineLatest } from 'rxjs';
import { RehearsalSupportComponent } from './rehearsal-support/rehearsal-support.component';
import { AudioPlayerComponent } from '@shared/components/audio-player/audio-player.component';
import { DebugLogService } from '@core/services/debug-log.service';
import { DurationPipe } from '@shared/pipes/duration.pipe';
import { ComposerYearsPipe } from '@shared/pipes/composer-years.pipe';
import { FileSizePipe } from '@shared/pipes/file-size.pipe';
import { Clipboard } from '@angular/cdk/clipboard';

@Component({
  selector: 'app-piece-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MaterialModule,
    RouterModule,
    EventTypeLabelPipe,
    PureDatePipe,
    RehearsalSupportComponent,
    AudioPlayerComponent,
    DurationPipe,
    ComposerYearsPipe,
    FileSizePipe
  ],
  templateUrl: './piece-detail.component.html',
  styleUrls: ['./piece-detail.component.scss']
})
export class PieceDetailComponent implements OnInit, OnDestroy {
  piece?: Piece;
  newNoteText = '';
  editState: { [id: number]: string } = {};
  userId: number | null = null;
  isAdmin = false;
  canRate = false;
  pieceImage: string | null = null;
  fileLinks: (PieceLink & { isPdf: boolean; size?: number; isMp3?: boolean; isImage?: boolean; isCapella?: boolean; isMuseScore?: boolean })[] = [];
  externalLinks: PieceLink[] = [];
  libraryItems: { [collectionId: number]: LibraryItem } = {};
  isDeveloper = false;

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService,
    private auth: AuthService,
    private dialog: MatDialog,
    private notification: NotificationService,
    private http: HttpClient,
    private titleService: Title,
    private logger: DebugLogService,
    private clipboard: Clipboard
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    const openEdit = this.route.snapshot.queryParamMap.get('edit') === 'true';
    this.loadPiece(id, () => {
      if (openEdit) this.openEditPieceDialog();
    });
    this.auth.currentUser$.subscribe(u => this.userId = u?.id || null);
    this.auth.isAdmin$.subscribe(a => this.isAdmin = a);
    combineLatest([this.auth.isChoirAdmin$, this.auth.isDirector$]).subscribe(([isChoirAdmin, isDirector]) => {
      this.canRate = isChoirAdmin || isDirector;
    });
    this.isDeveloper = this.logger.isEnabled();
    this.loadLibraryItems();
  }

  ngOnDestroy(): void {
    // Cleanup handled by AudioPlayerComponent
  }

  private loadPiece(id: number, afterLoad?: () => void): void {
    this.apiService.getRepertoirePiece(id).subscribe(p => {
      if (!p) return;
      this.piece = p;

      // Set page title
      const title = p.title ? `${p.title} - NAK Chorleiter` : 'NAK Chorleiter';
      this.titleService.setTitle(title);

      if (p.imageIdentifier) {
        this.apiService.getPieceImage(p.id).subscribe(img => this.pieceImage = img);
      } else {
        this.pieceImage = null;
      }
      this.fileLinks = (p.links?.filter(l => l.type === 'FILE_DOWNLOAD') || []).map(l => {
        return {
          ...l,
          isPdf: (typeof l.url === 'string' && /\.pdf$/i.test(l.url)) || (typeof l.description === 'string' && /\.pdf$/i.test(l.description)),
          isMp3: (typeof l.url === 'string' && /\.mp3$/i.test(l.url)) || (typeof l.description === 'string' && /\.mp3$/i.test(l.description)),
          isImage: (typeof l.url === 'string' && /\.(jpe?g|png|webp)$/i.test(l.url)) || (typeof l.description === 'string' && /\.(jpe?g|png|webp)$/i.test(l.description)),
          isCapella: (typeof l.url === 'string' && /\.(cap|capx)$/i.test(l.url)) || (typeof l.description === 'string' && /\.(cap|capx)$/i.test(l.description)),
          isMuseScore: (typeof l.url === 'string' && /\.(musicxml|mxl)$/i.test(l.url)) || (typeof l.description === 'string' && /\.(musicxml|mxl)$/i.test(l.description))
        };
      });
      this.fileLinks.forEach(link => {
        const url = this.getLinkUrl(link);
        this.http.head(url, { observe: 'response', responseType: 'blob' }).subscribe(res => {
          const size = Number(res.headers.get('Content-Length'));
          if (!isNaN(size)) {
            link.size = size;
          }
        });
      });
      this.externalLinks = p.links?.filter(l => l.type === 'EXTERNAL') || [];
      if (afterLoad) afterLoad();
    });
  }

  onStatusChange(newStatus: string): void {
    if (!this.piece) return;
    this.apiService.updatePieceStatus(this.piece.id, newStatus).subscribe(() => {
      if (!this.piece) return;
      this.piece.choir_repertoire = this.piece.choir_repertoire || { status: 'CAN_BE_SUNG' };
      this.piece.choir_repertoire.status = newStatus as any;
    });
  }

  onRatingChange(newRating: number | null): void {
    if (!this.piece) return;
    this.apiService.updatePieceRating(this.piece.id, newRating).subscribe(() => {
      if (!this.piece) return;
      this.piece.choir_repertoire = this.piece.choir_repertoire || { status: 'CAN_BE_SUNG' };
      this.piece.choir_repertoire.rating = newRating ?? null;
    });
  }

  canEdit(note: PieceNote): boolean {
    return note.author.id === this.userId || this.isAdmin;
  }

  startEdit(note: PieceNote): void {
    this.editState[note.id] = note.text;
  }

  cancelEdit(id: number): void {
    delete this.editState[id];
  }

  saveEdit(note: PieceNote): void {
    const text = this.editState[note.id];
    this.apiService.updatePieceNote(note.id, text).subscribe(updated => {
      if (this.piece) {
        const idx = this.piece.notes?.findIndex(n => n.id === note.id);
        if (idx != null && idx >= 0 && this.piece.notes) this.piece.notes[idx] = updated as any;
      }
      delete this.editState[note.id];
    });
  }

  deleteNote(note: PieceNote): void {
    if (!this.piece) return;
    this.apiService.deletePieceNote(note.id).subscribe(() => {
      if (this.piece) {
        this.piece.notes = this.piece.notes?.filter(n => n.id !== note.id);
      }
    });
  }

  addNote(): void {
    if (!this.piece || !this.newNoteText) return;
    this.apiService.addPieceNote(this.piece.id, this.newNoteText).subscribe(n => {
      if (!this.piece!.notes) this.piece!.notes = [];
      this.piece!.notes.unshift(n as any);
      this.newNoteText = '';
    });
  }

  private loadLibraryItems(): void {
    this.apiService.getLibraryItems().subscribe(items => {
      this.libraryItems = {};
      items.forEach(i => {
        const id = i.collectionId || i.collection?.id;
        if (id != null) {
          this.libraryItems[id] = i;
        }
      });
    });
  }

  openLibraryItem(collectionId: number, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const item = this.libraryItems[collectionId];
    if (!item) return;
    this.dialog.open(LibraryItemInfoDialogComponent, { data: item });
  }

  openEditPieceDialog(): void {
    if (!this.piece) return;
    const dialogRef = this.dialog.open(PieceDialogComponent, {
      width: '90vw',
      maxWidth: '1000px',
      data: { pieceId: this.piece.id }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (!this.piece || result === undefined) return;
      if (result) {
        this.notification.success('Stück aktualisiert.');
      }
      this.loadPiece(this.piece.id);
      this.loadLibraryItems();
    });
  }

  openReportDialog(): void {
    if (!this.piece) return;
    const dialogRef = this.dialog.open(PieceReportDialogComponent, { data: { pieceId: this.piece.id } });
    dialogRef.afterClosed().subscribe(sent => {
      if (sent) {
        this.notification.success('Meldung gesendet.');
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

  sharePiece(): void {
    if (!this.piece) return;

    this.apiService.generateShareToken(this.piece.id).subscribe({
      next: (response) => {
        const shareUrl = `${window.location.origin}/shared-piece/${response.shareToken}`;
        this.clipboard.copy(shareUrl);
        this.notification.success('Link wurde in die Zwischenablage kopiert.');
      },
      error: (err) => {
        this.notification.error('Fehler beim Erstellen des Share-Links.');
        console.error('Share error:', err);
      }
    });
  }
}
