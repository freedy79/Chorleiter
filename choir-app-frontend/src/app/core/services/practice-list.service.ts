import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, forkJoin, from, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import {
  PracticeList,
  PracticeListCreatePayload,
  PracticeListItem,
  PracticeListItemCreatePayload,
  PracticeListMembershipResponse,
  PracticeListItemUpdatePayload,
  PracticeListUpdatePayload
} from '@core/models/practice-list';
import { PracticeOfflineMediaService } from './practice-offline-media.service';

@Injectable({
  providedIn: 'root'
})
export class PracticeListService {
  private readonly apiUrl = `${environment.apiUrl}/practice-lists`;
  private readonly maxConcurrentDownloads = 3;
  private queue: Array<() => Promise<void>> = [];
  private activeDownloads = 0;

  constructor(
    private http: HttpClient,
    private offlineMedia: PracticeOfflineMediaService
  ) {}

  getLists(): Observable<PracticeList[]> {
    return this.http.get<PracticeList[]>(this.apiUrl);
  }

  createList(payload: PracticeListCreatePayload): Observable<PracticeList> {
    return this.http.post<PracticeList>(this.apiUrl, payload);
  }

  updateList(id: number, payload: PracticeListUpdatePayload): Observable<PracticeList> {
    return this.http.put<PracticeList>(`${this.apiUrl}/${id}`, payload);
  }

  deleteList(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getItems(listId: number): Observable<PracticeListItem[]> {
    return this.http.get<PracticeListItem[]>(`${this.apiUrl}/${listId}/items`);
  }

  getMembership(pieceId: number, pieceLinkId?: number | null): Observable<PracticeListMembershipResponse> {
    const params = new URLSearchParams();
    params.set('pieceId', String(pieceId));
    if (pieceLinkId !== null && pieceLinkId !== undefined) {
      params.set('pieceLinkId', String(pieceLinkId));
    }
    return this.http.get<PracticeListMembershipResponse>(`${this.apiUrl}/items/membership?${params.toString()}`);
  }

  addItem(listId: number, payload: PracticeListItemCreatePayload): Observable<PracticeListItem> {
    return this.http.post<PracticeListItem>(`${this.apiUrl}/${listId}/items`, payload);
  }

  updateItem(listId: number, itemId: number, payload: PracticeListItemUpdatePayload): Observable<PracticeListItem> {
    return this.http.put<PracticeListItem>(`${this.apiUrl}/${listId}/items/${itemId}`, payload);
  }

  deleteItem(listId: number, itemId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${listId}/items/${itemId}`);
  }

  reorderItems(listId: number, itemIds: number[]): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/${listId}/items/reorder`, { itemIds });
  }

  pinItem(listId: number, itemId: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/${listId}/items/${itemId}/pin`, {});
  }

  unpinItem(listId: number, itemId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${listId}/items/${itemId}/pin`);
  }

  refreshOfflinePins(): Observable<void> {
    return this.getLists().pipe(
      switchMap((lists) => {
        if (!lists.length) {
          return from(this.syncPinnedMedia([]));
        }

        return forkJoin(
          lists.map((list) =>
            this.getItems(list.id).pipe(
              catchError(() => of([] as PracticeListItem[]))
            )
          )
        ).pipe(
          map((allItems) => allItems.flat()),
          switchMap((items) => from(this.syncPinnedMedia(items)))
        );
      })
    );
  }

  async getOfflineStorageUsageBytes(): Promise<number> {
    return this.offlineMedia.getStorageUsageBytes();
  }

  async hasLocalPin(pieceLinkId: number): Promise<boolean> {
    return this.offlineMedia.hasPinnedMedia(pieceLinkId);
  }

  async getLocalPinnedMediaUrl(pieceLinkId: number): Promise<string | null> {
    return this.offlineMedia.getPinnedMediaObjectUrl(pieceLinkId);
  }

  getAbsoluteMediaUrl(url: string): string {
    return this.toAbsoluteUrl(url);
  }

  private async syncPinnedMedia(items: PracticeListItem[]): Promise<void> {
    const pinnedByLinkId = new Map<number, string>();

    for (const item of items) {
      const pieceLinkId = item.pieceLinkId ?? null;
      const pieceLink = item.pieceLink;
      if (!item.isPinnedOffline || !pieceLinkId || !pieceLink?.url) {
        continue;
      }
      if (pieceLink.type !== 'FILE_DOWNLOAD') {
        continue;
      }

      const absoluteUrl = this.getAbsoluteMediaUrl(pieceLink.url);
      if (!absoluteUrl) {
        continue;
      }

      pinnedByLinkId.set(pieceLinkId, absoluteUrl);
    }

    for (const [pieceLinkId, absoluteUrl] of pinnedByLinkId.entries()) {
      this.enqueue(async () => {
        const alreadyPinned = await this.offlineMedia.hasPinnedMedia(pieceLinkId);
        if (!alreadyPinned) {
          await this.offlineMedia.pinMedia(pieceLinkId, absoluteUrl);
        }
      });
    }

    await this.drainQueue();

    const localPinnedIds = await this.offlineMedia.getAllPinnedIds();
    for (const pinnedId of localPinnedIds) {
      if (!pinnedByLinkId.has(pinnedId)) {
        await this.offlineMedia.unpinMedia(pinnedId);
      }
    }
  }

  private enqueue(task: () => Promise<void>): void {
    this.queue.push(task);
  }

  private async drainQueue(): Promise<void> {
    if (!this.queue.length) {
      return;
    }

    await new Promise<void>((resolve) => {
      const runNext = () => {
        while (this.activeDownloads < this.maxConcurrentDownloads && this.queue.length) {
          const task = this.queue.shift();
          if (!task) {
            continue;
          }

          this.activeDownloads += 1;
          task()
            .catch(() => {
              // Fehler werden bewusst geschluckt; einzelne Downloadfehler blockieren die Queue nicht.
            })
            .finally(() => {
              this.activeDownloads -= 1;
              if (!this.queue.length && this.activeDownloads === 0) {
                resolve();
                return;
              }
              runNext();
            });
        }
      };

      runNext();
    });
  }

  private toAbsoluteUrl(url: string): string {
    if (/^https?:\/\//i.test(url)) {
      return url;
    }

    const apiRoot = environment.apiUrl.replace(/\/api\/?$/, '');
    const normalizedPath = url.startsWith('/') ? url : `/${url}`;
    const fullPath = normalizedPath.startsWith('/api/') ? normalizedPath : `/api${normalizedPath}`;
    return `${apiRoot}${fullPath}`;
  }
}
