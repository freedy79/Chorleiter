import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { RouterModule } from '@angular/router';
import { MaterialModule } from '@modules/material.module';
import { EventTypeLabelPipe } from '@shared/pipes/event-type-label.pipe';
import { ApiService } from '@core/services/api.service';
import { Piece, PieceNote } from '@core/models/piece';
import { PieceLink } from '@core/models/piece-link';
import { AuthService } from '@core/services/auth.service';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PieceDialogComponent } from '../piece-dialog/piece-dialog.component';
import { PieceReportDialogComponent } from '../piece-report-dialog/piece-report-dialog.component';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';
import { LibraryItem } from '@core/models/library-item';
import { LibraryItemInfoDialogComponent } from '../../library/library-item-info-dialog.component';
import { PureDatePipe } from '@shared/pipes/pure-date.pipe';
import { combineLatest } from 'rxjs';

@Component({
  selector: 'app-piece-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MaterialModule,
    RouterModule,
    EventTypeLabelPipe,
    PureDatePipe
  ],
  templateUrl: './piece-detail.component.html',
  styleUrls: ['./piece-detail.component.scss']
})
export class PieceDetailComponent implements OnInit {
  piece?: Piece;
  newNoteText = '';
  editState: { [id: number]: string } = {};
  userId: number | null = null;
  isAdmin = false;
  canRate = false;
  pieceImage: string | null = null;
  fileLinks: (PieceLink & { isPdf: boolean; size?: number })[] = [];
  externalLinks: PieceLink[] = [];
  libraryItems: { [collectionId: number]: LibraryItem } = {};

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService,
    private auth: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private http: HttpClient
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
    this.loadLibraryItems();
  }

  private loadPiece(id: number, afterLoad?: () => void): void {
    this.apiService.getRepertoirePiece(id).subscribe(p => {
      if (!p) return;
      this.piece = p;
      if (p.imageIdentifier) {
        this.apiService.getPieceImage(p.id).subscribe(img => this.pieceImage = img);
      } else {
        this.pieceImage = null;
      }
      this.fileLinks = (p.links?.filter(l => l.type === 'FILE_DOWNLOAD') || []).map(l => ({
        ...l,
        isPdf: /\.pdf$/i.test(l.url) || /\.pdf$/i.test(l.description)
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

    dialogRef.afterClosed().subscribe(wasUpdated => {
      if (wasUpdated) {
        this.snackBar.open('Stück aktualisiert.', 'OK', { duration: 3000 });
        this.loadPiece(this.piece!.id);
      }
    });
  }

  openReportDialog(): void {
    if (!this.piece) return;
    const dialogRef = this.dialog.open(PieceReportDialogComponent, { data: { pieceId: this.piece.id } });
    dialogRef.afterClosed().subscribe(sent => {
      if (sent) {
        this.snackBar.open('Meldung gesendet.', 'OK', { duration: 3000 });
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
