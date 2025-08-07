import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { PageEvent } from '@angular/material/paginator';
import { LibraryItem } from '@core/models/library-item';
import { Piece } from '@core/models/piece';
import { Collection } from '@core/models/collection';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class LibraryUtilService {
  expandedItem: LibraryItem | null = null;
  expandedPieces: Piece[] = [];
  piecePageSize = 10;
  piecePageIndex = 0;
  private composerCache = new Map<number, string>();

  constructor(private api: ApiService, private router: Router) {}

  toggleCollection(item: LibraryItem): void {
    const colId = item.collection?.id;
    if (!colId) return;

    if (this.expandedItem === item) {
      this.expandedItem = null;
      return;
    }

    this.api.getCollectionById(colId).subscribe(col => {
      if ((col.singleEdition || (col.pieces && col.pieces.length === 1)) && col.pieces && col.pieces.length === 1) {
        this.router.navigate(['/pieces', col.pieces[0].id]);
      } else {
        this.expandedItem = item;
        this.expandedPieces = col.pieces || [];
        this.piecePageIndex = 0;
      }
    });
  }

  onPiecePage(event: PageEvent): void {
    this.piecePageIndex = event.pageIndex;
    this.piecePageSize = event.pageSize;
  }

  get paginatedPieces(): Piece[] {
    const start = this.piecePageIndex * this.piecePageSize;
    return this.expandedPieces.slice(start, start + this.piecePageSize);
  }

  getCollectionHint(collection?: Collection): string {
    if (!collection) return '';
    return collection.subtitle || '';
  }

  getCollectionComposer(collection?: Collection): string {
    if (!collection) return '';

    if (collection.pieceCount === 1) {
      const cached = this.composerCache.get(collection.id);
      if (cached !== undefined) {
        return cached;
      }
      this.composerCache.set(collection.id, '');
      this.api.getCollectionById(collection.id).subscribe(col => {
        const name = col.pieces?.[0]?.composer?.name || col.pieces?.[0]?.origin || '';
        this.composerCache.set(collection.id, name);
      });
    }
    return '';
  }
}
