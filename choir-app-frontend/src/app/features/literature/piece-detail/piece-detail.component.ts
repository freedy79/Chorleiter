import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
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
import { PieceDeleteDialogComponent } from '../piece-delete-dialog.component';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';
import { LibraryItem } from '@core/models/library-item';
import { LibraryItemInfoDialogComponent } from '../../library/library-item-info-dialog.component';
import { PureDatePipe } from '@shared/pipes/pure-date.pipe';
import { combineLatest, forkJoin, of } from 'rxjs';
import { RehearsalSupportComponent } from './rehearsal-support/rehearsal-support.component';
import { AudioPlayerComponent } from '@shared/components/audio-player/audio-player.component';
import { DebugLogService } from '@core/services/debug-log.service';
import { DurationPipe } from '@shared/pipes/duration.pipe';
import { ComposerYearsPipe } from '@shared/pipes/composer-years.pipe';
import { FileSizePipe } from '@shared/pipes/file-size.pipe';
import { Clipboard } from '@angular/cdk/clipboard';
import { PracticeListService } from '@core/services/practice-list.service';
import { AddToPracticeListDialogComponent, AddToPracticeListDialogResult } from './add-to-practice-list-dialog.component';
import { PdfFullscreenDialogAudioOption, PdfFullscreenDialogComponent } from '@shared/components/pdf-fullscreen-dialog/pdf-fullscreen-dialog.component';
import { catchError, map } from 'rxjs/operators';

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
export class PieceDetailComponent implements OnInit {
  piece?: Piece;
  newNoteText = '';
  editState: { [id: number]: string } = {};
  userId: number | null = null;
  isAdmin = false;
  canRate = false;
  pieceImage: string | null = null;
  fileLinks: DisplayFileLink[] = [];
  groupedFileLinks: FileLinkGroup[] = [];
  externalLinks: PieceLink[] = [];
  libraryItems: { [collectionId: number]: LibraryItem } = {};
  isDeveloper = false;
  localPinnedLinkIds = new Set<number>();
  viewableLicenseByCollection: Record<number, number> = {};

  get hasVisibleMp3Player(): boolean {
    return this.fileLinks.some(link => !!link.isMp3);
  }

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService,
    private auth: AuthService,
    private dialog: MatDialog,
    private notification: NotificationService,
    private http: HttpClient,
    private titleService: Title,
    private logger: DebugLogService,
    private clipboard: Clipboard,
    private location: Location,
    private practiceListService: PracticeListService
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
      void this.refreshLocalPinnedState();
      this.externalLinks = p.links?.filter(l => l.type === 'EXTERNAL') || [];
      this.loadViewableLicensesForCollections((p.collections || []).map(c => Number(c.id)).filter(id => Number.isFinite(id)));
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

  openViewOnlyCollectionLicense(collectionId: number, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    const licenseId = this.viewableLicenseByCollection[collectionId];
    if (!licenseId) {
      this.notification.warning('Für diese Sammlung ist keine digitale Originallizenz hinterlegt.');
      return;
    }

    const url = this.apiService.getCollectionDigitalLicenseInlineViewUrl(licenseId);
    this.dialog.open(PdfFullscreenDialogComponent, {
      data: {
        url,
        title: 'Digitale Originallizenz',
        allowOpenInNewTab: false
      },
      panelClass: 'pdf-fullscreen-dialog-panel',
      width: '100vw',
      maxWidth: '100vw',
      height: '100vh',
      maxHeight: '100vh',
      autoFocus: false,
      restoreFocus: false
    });
  }

  hasViewOnlyCollectionLicense(collectionId: number): boolean {
    return !!this.viewableLicenseByCollection[collectionId];
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

  deletePiece(): void {
    if (!this.piece) return;

    const choirId = this.auth.activeChoir$.value?.id;
    if (!choirId) {
      this.notification.error('Chor-Kontext nicht verfügbar');
      return;
    }

    // Store piece reference for use in callbacks
    const piece = this.piece;

    // First check if piece is in any collections
    this.apiService.getPieceCollections(choirId, piece.id).subscribe({
      next: (result: any) => {
        if (result.affectedCollections && result.affectedCollections.length > 0) {
          // Piece is in collections, show error
          this.dialog.open(PieceDeleteDialogComponent, {
            data: {
              canDelete: false,
              collections: result.affectedCollections
            },
            width: '500px'
          });
        } else {
          // Piece is not in any collections, confirm deletion
          if (confirm(`Möchten Sie das Stück "${piece.title}" wirklich löschen?`)) {
            this.apiService.deletePiece(piece.id, choirId).subscribe({
              next: () => {
                this.notification.success('Stück wurde gelöscht');
                this.location.back();
              },
              error: (err: any) => {
                this.notification.error('Fehler beim Löschen: ' + (err.error?.message || err.message));
              }
            });
          }
        }
      },
      error: (err: any) => {
        this.notification.error('Fehler beim Prüfen der Sammlungen');
        console.error(err);
      }
    });
  }

  goBack(): void {
    this.location.back();
  }

  openAddToPracticeListDialog(link?: PieceLink | null, preselectPinOffline = false): void {
    if (!this.piece) return;

    const dialogRef = this.dialog.open(AddToPracticeListDialogComponent, {
      width: '500px',
      data: {
        pieceId: this.piece.id,
        pieceTitle: this.piece.title,
        pieceLinkId: link?.id ?? null,
        pieceLinkDescription: link?.description || '',
        preselectPinOffline
      }
    });

    dialogRef.afterClosed().subscribe((result?: AddToPracticeListDialogResult) => {
      if (!result?.changed || !result.addedItems.length) {
        return;
      }

      const addedListNames = Array.from(new Set(result.addedItems.map(item => item.listTitle))).filter(Boolean);
      const message = addedListNames.length
        ? `Hinzugefügt zu: ${addedListNames.join(', ')}`
        : 'Zur Übungsliste hinzugefügt.';
      const snackBarRef = this.notification.successWithAction(message, 'Rückgängig', 7000);
      snackBarRef.onAction().subscribe(() => {
        this.undoPracticeListAdds(result.addedItems);
      });

      this.practiceListService.refreshOfflinePins().subscribe({
        next: () => void this.refreshLocalPinnedState(),
        error: () => void this.refreshLocalPinnedState()
      });
    });
  }

  isLinkLocallyPinned(link: PieceLink): boolean {
    return this.localPinnedLinkIds.has(link.id);
  }

  async openPdfFullscreen(link: PieceLink & { isPdf?: boolean }): Promise<void> {
    if (!link?.isPdf) {
      return;
    }

    let url = this.getLinkUrl(link);
    if (!url) {
      this.notification.warning('PDF-Link konnte nicht geöffnet werden.');
      return;
    }

    if (this.localPinnedLinkIds.has(link.id)) {
      const localUrl = await this.practiceListService.getLocalPinnedMediaUrl(link.id);
      if (localUrl) {
        url = localUrl;
      }
    }

    const audioOptions = await this.buildPdfDialogAudioOptions();

    this.dialog.open(PdfFullscreenDialogComponent, {
      data: {
        url,
        title: link.description || this.piece?.title || 'PDF',
        audioOptions
      },
      panelClass: 'pdf-fullscreen-dialog-panel',
      width: '100vw',
      maxWidth: '100vw',
      height: '100vh',
      maxHeight: '100vh',
      autoFocus: false,
      restoreFocus: false
    });
  }

  private async buildPdfDialogAudioOptions(): Promise<PdfFullscreenDialogAudioOption[]> {
    const mp3Links = this.fileLinks.filter(link => !!link.isMp3);
    if (!mp3Links.length) {
      return [];
    }

    const resolved = await Promise.all(
      mp3Links.map(async (audioLink, index) => {
        let audioUrl = this.getLinkUrl(audioLink);

        if (!audioUrl) {
          return null;
        }

        if (this.localPinnedLinkIds.has(audioLink.id)) {
          const localUrl = await this.practiceListService.getLocalPinnedMediaUrl(audioLink.id);
          if (localUrl) {
            audioUrl = localUrl;
          }
        }

        const label = (audioLink.description || audioLink.downloadName || `MP3 ${index + 1}`).trim();
        return { label, url: audioUrl };
      })
    );

    return resolved.filter((item): item is PdfFullscreenDialogAudioOption => !!item?.url);
  }

  private async refreshLocalPinnedState(): Promise<void> {
    const ids = this.fileLinks.map(link => link.id).filter((id): id is number => Number.isFinite(id));
    const pinned = new Set<number>();

    await Promise.all(
      ids.map(async (id) => {
        const hasLocal = await this.practiceListService.hasLocalPin(id);
        if (hasLocal) {
          pinned.add(id);
        }
      })
    );

    this.localPinnedLinkIds = pinned;
  }

  private loadViewableLicensesForCollections(collectionIds: number[]): void {
    const uniqueIds = Array.from(new Set(collectionIds.filter(id => Number.isFinite(id))));
    if (!uniqueIds.length) {
      this.viewableLicenseByCollection = {};
      return;
    }

    forkJoin(
      uniqueIds.map((collectionId) =>
        this.apiService.getCollectionViewableDigitalLicenses(collectionId).pipe(
          catchError(() => of([]))
        )
      )
    ).subscribe((responses) => {
      const next: Record<number, number> = {};
      responses.forEach((licenses: any, idx) => {
        const first = Array.isArray(licenses) ? licenses[0] : null;
        if (first?.id) {
          next[uniqueIds[idx]] = Number(first.id);
        }
      });
      this.viewableLicenseByCollection = next;
    });
  }

  private undoPracticeListAdds(addedItems: Array<{ listId: number; listTitle: string; itemId: number }>): void {
    if (!addedItems.length) {
      return;
    }

    forkJoin(
      addedItems.map((item) =>
        this.practiceListService.deleteItem(item.listId, item.itemId).pipe(
          map(() => ({ ok: true as const })),
          catchError(() => of({ ok: false as const }))
        )
      )
    ).subscribe((results) => {
      const failedCount = results.filter(result => !result.ok).length;
      if (failedCount) {
        this.notification.warning('Rückgängig teilweise fehlgeschlagen.');
      } else {
        this.notification.success('Hinzufügen rückgängig gemacht.');
      }

      this.practiceListService.refreshOfflinePins().subscribe({
        next: () => void this.refreshLocalPinnedState(),
        error: () => void this.refreshLocalPinnedState()
      });
    });
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
