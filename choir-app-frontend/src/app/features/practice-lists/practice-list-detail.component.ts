import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, DOCUMENT, Location } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MaterialModule } from '@modules/material.module';
import { PracticeList, PracticeListItem } from '@core/models/practice-list';
import { PracticeListService } from '@core/services/practice-list.service';
import { NotificationService } from '@core/services/notification.service';
import { AudioPlayerComponent } from '@shared/components/audio-player/audio-player.component';
import { PdfFullscreenDialogComponent } from '@shared/components/pdf-fullscreen-dialog/pdf-fullscreen-dialog.component';

interface MappePieceGroup {
  pieceId: number;
  title: string;
  pdfItems: PracticeListItem[];
  audioItems: PracticeListItem[];
  showAllMedia: boolean;
}

@Component({
  selector: 'app-practice-list-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MaterialModule, AudioPlayerComponent],
  templateUrl: './practice-list-detail.component.html',
  styleUrls: ['./practice-list-detail.component.scss']
})
export class PracticeListDetailComponent implements OnInit, OnDestroy {
  listId = 0;
  list: PracticeList | null = null;
  items: PracticeListItem[] = [];
  loading = false;
  mappeMode = false;
  mappeCursor = 0;
  mappeAutoAdvance = false;
  mappeActivePdfSafeUrl: SafeResourceUrl | null = null;
  mappeActivePdfRawUrl = '';
  mappeResolvingPdf = false;
  private previousBodyOverflow = '';
  selectedPdfByPiece = new Map<number, number>();
  selectedAudioByPiece = new Map<number, number>();
  localPinnedLinkIds = new Set<number>();
  resolvedMediaUrls = new Map<string, string>();

  constructor(
    private route: ActivatedRoute,
    private location: Location,
    private practiceListService: PracticeListService,
    private notification: NotificationService,
    private dialog: MatDialog,
    private sanitizer: DomSanitizer,
    @Inject(DOCUMENT) private document: Document
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    this.listId = Number(idParam);
    if (!this.listId) {
      this.notification.error('Ungültige Übungsliste.');
      this.goBack();
      return;
    }

    this.loadData();
  }

  ngOnDestroy(): void {
    this.setMappeBodyScrollLock(false);
  }

  loadData(): void {
    this.loading = true;

    this.practiceListService.getLists().subscribe({
      next: (lists) => {
        this.list = lists.find(l => l.id === this.listId) || null;
      },
      error: () => {
        this.notification.error('Übungsliste konnte nicht geladen werden.');
      }
    });

    this.practiceListService.getItems(this.listId).subscribe({
      next: (items) => {
        this.items = [...items].sort((a, b) => a.orderIndex - b.orderIndex);
        this.ensureMappeCursorInBounds();
        this.loading = false;
        void this.refreshLocalPinnedState().then(() => this.hydrateResolvedMediaUrls());
      },
      error: () => {
        this.notification.error('Einträge konnten nicht geladen werden.');
        this.loading = false;
      }
    });
  }

  updateListTitle(): void {
    if (!this.list) {
      return;
    }

    const next = window.prompt('Neuer Titel der Übungsliste', this.list.title)?.trim();
    if (!next || next === this.list.title) {
      return;
    }

    this.practiceListService.updateList(this.listId, { title: next }).subscribe({
      next: () => {
        if (this.list) {
          this.list.title = next;
        }
        this.notification.success('Titel aktualisiert.');
      },
      error: () => this.notification.error('Titel konnte nicht aktualisiert werden.')
    });
  }

  saveNote(item: PracticeListItem): void {
    this.practiceListService.updateItem(this.listId, item.id, { note: item.note || null }).subscribe({
      next: () => this.notification.success('Notiz gespeichert.'),
      error: () => this.notification.error('Notiz konnte nicht gespeichert werden.')
    });
  }

  removeItem(item: PracticeListItem): void {
    this.practiceListService.deleteItem(this.listId, item.id).subscribe({
      next: () => {
        this.notification.success('Eintrag entfernt.');
        this.practiceListService.refreshOfflinePins().subscribe({
          next: () => this.loadData(),
          error: () => this.loadData()
        });
      },
      error: () => this.notification.error('Eintrag konnte nicht entfernt werden.')
    });
  }

  togglePin(item: PracticeListItem): void {
    const isPinning = !item.isPinnedOffline;
    const request$ = isPinning
      ? this.practiceListService.pinItem(this.listId, item.id)
      : this.practiceListService.unpinItem(this.listId, item.id);

    request$.subscribe({
      next: () => {
        item.isPinnedOffline = isPinning;
        this.practiceListService.refreshOfflinePins().subscribe({
          next: () => {
            this.notification.success(isPinning ? 'Offline-Pin gesetzt.' : 'Offline-Pin entfernt.');
            void this.refreshLocalPinnedState();
          },
          error: () => {
            this.notification.error('Offline-Synchronisierung fehlgeschlagen.');
          }
        });
      },
      error: () => this.notification.error('Pin-Status konnte nicht geändert werden.')
    });
  }

  moveItemUp(index: number): void {
    if (index <= 0) {
      return;
    }
    this.swapAndPersist(index, index - 1);
  }

  moveItemDown(index: number): void {
    if (index >= this.items.length - 1) {
      return;
    }
    this.swapAndPersist(index, index + 1);
  }

  goBack(): void {
    this.location.back();
  }

  toggleMappeMode(): void {
    if (!this.mappeMode) {
      const groups = this.getMappePieceGroups();
      if (!groups.length) {
        this.notification.warning('Mappe-Modus ist nur mit PDF- oder Audio-Dateien verfügbar.');
        this.mappeMode = false;
        return;
      }

      this.mappeCursor = 0;
    }

    this.mappeMode = !this.mappeMode;
    this.ensureMappeCursorInBounds();

    if (this.mappeMode) {
      void this.syncMappePdfViewer();
      this.setMappeBodyScrollLock(true);
      return;
    }

    this.clearMappePdfViewer();
    this.setMappeBodyScrollLock(false);
  }

  isPdfItem(item: PracticeListItem): boolean {
    const pieceLink = item.pieceLink;
    if (!this.isDownloadablePieceLink(pieceLink)) {
      return false;
    }

    const url = (pieceLink.url || '').toLowerCase();
    const downloadName = (pieceLink.downloadName || '').toLowerCase();
    return url.includes('.pdf') || downloadName.endsWith('.pdf');
  }

  isAudioItem(item: PracticeListItem): boolean {
    const pieceLink = item.pieceLink;
    if (!this.isDownloadablePieceLink(pieceLink)) {
      return false;
    }

    const url = (pieceLink.url || '').toLowerCase();
    const downloadName = (pieceLink.downloadName || '').toLowerCase();
    return url.includes('.mp3') || url.includes('.mpeg') || downloadName.endsWith('.mp3') || downloadName.endsWith('.mpeg');
  }

  getMappePdfItems(): PracticeListItem[] {
    return this.getExpandedMediaItems(this.items).filter(item => this.isPdfItem(item));
  }

  getMappeAudioItems(): PracticeListItem[] {
    return this.getExpandedMediaItems(this.items).filter(item => this.isAudioItem(item));
  }

  getMappePieceGroups(): MappePieceGroup[] {
    const byPiece = new Map<number, MappePieceGroup>();
    const pieceIdsWithWholePieceEntry = new Set(
      this.items
        .filter(item => this.isWholePieceItem(item))
        .map(item => Number(item.pieceId))
    );

    const expandedItems = this.getExpandedMediaItems(this.items);

    for (const item of expandedItems) {
      const pieceId = Number(item.pieceId);
      const existing = byPiece.get(pieceId) || {
        pieceId,
        title: item.piece?.title || `Stück #${pieceId}`,
        pdfItems: [],
        audioItems: [],
        showAllMedia: pieceIdsWithWholePieceEntry.has(pieceId)
      };

      if (this.isPdfItem(item)) {
        this.pushUniqueMediaItem(existing.pdfItems, item);
      }
      if (this.isAudioItem(item)) {
        this.pushUniqueMediaItem(existing.audioItems, item);
      }

      existing.showAllMedia = existing.showAllMedia || pieceIdsWithWholePieceEntry.has(pieceId);

      byPiece.set(pieceId, existing);
    }

    return Array.from(byPiece.values()).filter(g => g.pdfItems.length || g.audioItems.length);
  }

  getActiveMappePieceGroup(): MappePieceGroup | null {
    const groups = this.getMappePieceGroups();
    if (!groups.length) {
      return null;
    }
    const clamped = Math.max(0, Math.min(this.mappeCursor, groups.length - 1));
    if (clamped !== this.mappeCursor) {
      this.mappeCursor = clamped;
    }
    return groups[clamped] || null;
  }

  getMappePositionLabel(): string {
    const groups = this.getMappePieceGroups();
    if (!groups.length) {
      return '0 / 0';
    }
    return `${this.mappeCursor + 1} / ${groups.length}`;
  }

  mappePrevPiece(): void {
    if (this.mappeCursor <= 0) {
      return;
    }
    this.mappeCursor -= 1;
    void this.syncMappePdfViewer();
  }

  mappeNextPiece(): void {
    const groups = this.getMappePieceGroups();
    if (this.mappeCursor >= groups.length - 1) {
      return;
    }
    this.mappeCursor += 1;
    void this.syncMappePdfViewer();
  }

  hasMultiplePdf(group: MappePieceGroup): boolean {
    return group.pdfItems.length > 1;
  }

  hasMultipleAudio(group: MappePieceGroup): boolean {
    return group.audioItems.length > 1;
  }

  shouldShowMappeSingleSelection(group: MappePieceGroup): boolean {
    return !group.showAllMedia;
  }

  getMappePdfItemsToRender(group: MappePieceGroup): PracticeListItem[] {
    if (group.showAllMedia) {
      return group.pdfItems;
    }

    const selected = this.getSelectedPdfItem(group);
    return selected ? [selected] : [];
  }

  getMappeAudioItemsToRender(group: MappePieceGroup): PracticeListItem[] {
    if (group.showAllMedia) {
      return group.audioItems;
    }

    const selected = this.getSelectedAudioItem(group);
    return selected ? [selected] : [];
  }

  getItemPdfItems(item: PracticeListItem): PracticeListItem[] {
    return this.expandItemWithPieceMedia(item).filter(expanded => this.isPdfItem(expanded));
  }

  getItemAudioItems(item: PracticeListItem): PracticeListItem[] {
    return this.expandItemWithPieceMedia(item).filter(expanded => this.isAudioItem(expanded));
  }

  getSelectedPdfItem(group: MappePieceGroup): PracticeListItem | null {
    if (!group.pdfItems.length) {
      return null;
    }

    const selectedPieceLinkId = this.selectedPdfByPiece.get(group.pieceId);
    if (selectedPieceLinkId) {
      const selected = group.pdfItems.find(i => i.pieceLinkId === selectedPieceLinkId);
      if (selected) {
        return selected;
      }
    }

    const fallback = group.pdfItems[0];
    if (fallback.pieceLinkId) {
      this.selectedPdfByPiece.set(group.pieceId, fallback.pieceLinkId);
    }
    return fallback;
  }

  getSelectedAudioItem(group: MappePieceGroup): PracticeListItem | null {
    if (!group.audioItems.length) {
      return null;
    }

    const selectedPieceLinkId = this.selectedAudioByPiece.get(group.pieceId);
    if (selectedPieceLinkId) {
      const selected = group.audioItems.find(i => i.pieceLinkId === selectedPieceLinkId);
      if (selected) {
        return selected;
      }
    }

    const fallback = group.audioItems[0];
    if (fallback.pieceLinkId) {
      this.selectedAudioByPiece.set(group.pieceId, fallback.pieceLinkId);
    }
    return fallback;
  }

  selectPdfForPiece(group: MappePieceGroup, pieceLinkId: number): void {
    this.selectedPdfByPiece.set(group.pieceId, pieceLinkId);
    if (this.getActiveMappePieceGroup()?.pieceId === group.pieceId) {
      void this.syncMappePdfViewer();
    }
  }

  selectAudioForPiece(group: MappePieceGroup, pieceLinkId: number): void {
    this.selectedAudioByPiece.set(group.pieceId, pieceLinkId);
  }

  async openActivePdfFullscreen(group: MappePieceGroup): Promise<void> {
    const selected = this.getSelectedPdfItem(group);
    if (!selected) {
      return;
    }
    await this.openPdfFullscreen(selected);
  }

  async openActivePdfInNewTab(group: MappePieceGroup): Promise<void> {
    const selected = this.getSelectedPdfItem(group);
    if (!selected) {
      return;
    }
    await this.openPdfInNewTab(selected);
  }

  onMappeAudioEnded(): void {
    if (!this.mappeAutoAdvance) {
      return;
    }
    this.mappeNextPiece();
  }

  isFirstMappePiece(): boolean {
    return this.mappeCursor === 0;
  }

  isLastMappePiece(): boolean {
    const groups = this.getMappePieceGroups();
    return !groups.length || this.mappeCursor >= groups.length - 1;
  }

  async openCurrentMappePdfInNewTab(): Promise<void> {
    const group = this.getActiveMappePieceGroup();
    if (!group) {
      return;
    }

    await this.openActivePdfInNewTab(group);
  }

  getResolvedMediaUrl(item: PracticeListItem): string {
    const cacheKey = this.getMediaCacheKey(item);
    return this.resolvedMediaUrls.get(cacheKey) || this.practiceListService.getAbsoluteMediaUrl(item.pieceLink?.url || '');
  }

  async openPdfFullscreen(item: PracticeListItem): Promise<void> {
    if (!this.isPdfItem(item)) {
      return;
    }

    const url = await this.resolveMediaUrl(item);
    if (!url) {
      this.notification.warning('PDF-Link konnte nicht geöffnet werden.');
      return;
    }

    this.dialog.open(PdfFullscreenDialogComponent, {
      data: {
        url,
        title: item.piece?.title || item.pieceLink?.description || 'PDF'
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

  async openPdfInNewTab(item: PracticeListItem): Promise<void> {
    if (!this.isPdfItem(item)) {
      return;
    }

    const url = await this.resolveMediaUrl(item);
    if (!url) {
      this.notification.warning('PDF-Link konnte nicht geöffnet werden.');
      return;
    }

    window.open(url, '_blank', 'noopener');
  }

  private swapAndPersist(indexA: number, indexB: number): void {
    const clone = [...this.items];
    const tmp = clone[indexA];
    clone[indexA] = clone[indexB];
    clone[indexB] = tmp;

    this.items = clone.map((item, index) => ({ ...item, orderIndex: index }));

    const ids = this.items.map(i => i.id);
    this.practiceListService.reorderItems(this.listId, ids).subscribe({
      next: () => this.notification.success('Reihenfolge aktualisiert.'),
      error: () => {
        this.notification.error('Reihenfolge konnte nicht gespeichert werden.');
        this.loadData();
      }
    });
  }

  private async refreshLocalPinnedState(): Promise<void> {
    const pinned = new Set<number>();
    const checks = this.items
      .map(item => item.pieceLinkId)
      .filter((id): id is number => !!id)
      .map(async (id) => {
        const hasLocal = await this.practiceListService.hasLocalPin(id);
        if (hasLocal) {
          pinned.add(id);
        }
      });

    await Promise.all(checks);
    this.localPinnedLinkIds = pinned;
  }

  private async hydrateResolvedMediaUrls(): Promise<void> {
    const entries = await Promise.all(
      this.items.map(async (item) => {
        const expandedItems = this.expandItemWithPieceMedia(item);
        const resolved = await Promise.all(
          expandedItems.map(async expanded => {
            const url = await this.resolveMediaUrl(expanded);
            return [this.getMediaCacheKey(expanded), url] as const;
          })
        );
        return resolved;
      })
    );

    this.resolvedMediaUrls = new Map(
      entries
        .flat()
        .filter(([, url]) => !!url) as Array<[string, string]>
    );
  }

  private async resolveMediaUrl(item: PracticeListItem): Promise<string | null> {
    const pieceLink = item.pieceLink;
    if (!pieceLink?.url) {
      return null;
    }

    const pieceLinkId = item.pieceLinkId ?? null;
    if (pieceLinkId && this.localPinnedLinkIds.has(pieceLinkId)) {
      const localUrl = await this.practiceListService.getLocalPinnedMediaUrl(pieceLinkId);
      if (localUrl) {
        return localUrl;
      }
    }

    return this.practiceListService.getAbsoluteMediaUrl(pieceLink.url);
  }

  private getExpandedMediaItems(sourceItems: PracticeListItem[]): PracticeListItem[] {
    if (!Array.isArray(sourceItems) || !sourceItems.length) {
      return [];
    }

    return sourceItems.flatMap(item => this.expandItemWithPieceMedia(item));
  }

  private expandItemWithPieceMedia(item: PracticeListItem): PracticeListItem[] {
    if (!item) {
      return [];
    }

    if (this.isDownloadablePieceLink(item.pieceLink)) {
      return [item];
    }

    const pieceLinks = Array.isArray(item.piece?.links) ? item.piece.links : [];
    const links = pieceLinks.filter(link => this.isDownloadablePieceLink(link));
    if (!links.length) {
      return [];
    }

    return links.map(link => ({
      ...item,
      pieceLinkId: link.id,
      pieceLink: {
        id: link.id,
        description: link.description,
        url: link.url,
        downloadName: link.downloadName,
        type: link.type
      }
    }));
  }

  private getMediaCacheKey(item: PracticeListItem): string {
    const linkId = item.pieceLinkId ?? 0;
    return `${item.id}:${linkId}`;
  }

  private isWholePieceItem(item: PracticeListItem): boolean {
    return !item.pieceLinkId && !this.isDownloadablePieceLink(item.pieceLink);
  }

  private pushUniqueMediaItem(target: PracticeListItem[], candidate: PracticeListItem): void {
    const candidateLinkId = candidate.pieceLinkId ?? candidate.pieceLink?.id ?? null;
    if (candidateLinkId) {
      const duplicate = target.some(existing => (existing.pieceLinkId ?? existing.pieceLink?.id ?? null) === candidateLinkId);
      if (duplicate) {
        return;
      }
    }

    target.push(candidate);
  }

  private isDownloadablePieceLink(
    link: PracticeListItem['pieceLink'] | null | undefined
  ): link is NonNullable<PracticeListItem['pieceLink']> {
    return !!link && link.type === 'FILE_DOWNLOAD' && typeof link.url === 'string' && link.url.trim().length > 0;
  }

  private ensureMappeCursorInBounds(): void {
    const groupsLength = this.getMappePieceGroups().length;
    if (!groupsLength) {
      this.mappeCursor = 0;
      return;
    }
    if (this.mappeCursor >= groupsLength) {
      this.mappeCursor = groupsLength - 1;
    }
    if (this.mappeCursor < 0) {
      this.mappeCursor = 0;
    }
  }

  private async syncMappePdfViewer(): Promise<void> {
    const group = this.getActiveMappePieceGroup();
    if (!group) {
      this.clearMappePdfViewer();
      return;
    }

    const selectedPdf = this.getSelectedPdfItem(group);
    if (!selectedPdf) {
      this.clearMappePdfViewer();
      return;
    }

    this.mappeResolvingPdf = true;
    const resolvedUrl = await this.resolveMediaUrl(selectedPdf);
    this.mappeResolvingPdf = false;

    if (!resolvedUrl) {
      this.clearMappePdfViewer();
      return;
    }

    this.mappeActivePdfRawUrl = resolvedUrl;
    this.mappeActivePdfSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(resolvedUrl);
  }

  private clearMappePdfViewer(): void {
    this.mappeActivePdfRawUrl = '';
    this.mappeActivePdfSafeUrl = null;
    this.mappeResolvingPdf = false;
  }

  private setMappeBodyScrollLock(enabled: boolean): void {
    const body = this.document?.body;
    if (!body) {
      return;
    }

    if (enabled) {
      this.previousBodyOverflow = body.style.overflow || '';
      body.style.overflow = 'hidden';
      return;
    }

    body.style.overflow = this.previousBodyOverflow;
  }
}
