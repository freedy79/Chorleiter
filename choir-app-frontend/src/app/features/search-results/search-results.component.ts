import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MaterialModule } from '@modules/material.module';
import { SearchService, SearchAllResult } from '@core/services/search.service';
import { Piece } from '@core/models/piece';
import { SearchBoxComponent } from '@shared/components/search-box/search-box.component';

@Component({
  selector: 'app-search-results',
  standalone: true,
  imports: [CommonModule, MaterialModule, RouterModule, SearchBoxComponent],
  templateUrl: './search-results.component.html',
})
export class SearchResultsComponent implements OnInit {
  query = '';
  results: SearchAllResult = { pieces: [], totalPieces: 0, events: [], totalEvents: 0, collections: [], totalCollections: 0, composerPieces: [], publisherCollections: [] };
  loadingMore: { pieces?: boolean; events?: boolean; collections?: boolean } = {};

  constructor(private route: ActivatedRoute, private search: SearchService) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      this.query = params.get('q') || '';
      if (this.query) {
        this.search.searchAll(this.query).subscribe(res => {
          this.results = {
            pieces: res.pieces || [],
            totalPieces: res.totalPieces || 0,
            events: res.events || [],
            totalEvents: res.totalEvents || 0,
            collections: res.collections || [],
            totalCollections: res.totalCollections || 0,
            composerPieces: res.composerPieces || [],
            publisherCollections: res.publisherCollections || []
          };
        });
      } else {
        this.results = { pieces: [], totalPieces: 0, events: [], totalEvents: 0, collections: [], totalCollections: 0, composerPieces: [], publisherCollections: [] };
      }
    });
  }

  get hasMorePieces(): boolean {
    return this.results.pieces.length < this.results.totalPieces;
  }

  get hasMoreEvents(): boolean {
    return this.results.events.length < this.results.totalEvents;
  }

  get hasMoreCollections(): boolean {
    return this.results.collections.length < this.results.totalCollections;
  }

  remainingPieces(): number {
    return this.results.totalPieces - this.results.pieces.length;
  }

  remainingEvents(): number {
    return this.results.totalEvents - this.results.events.length;
  }

  remainingCollections(): number {
    return this.results.totalCollections - this.results.collections.length;
  }

  loadMore(category: 'pieces' | 'events' | 'collections'): void {
    if (this.loadingMore[category]) return;
    this.loadingMore[category] = true;

    const offsets: Record<string, number> = {};
    if (category === 'pieces') offsets['offsetPieces'] = this.results.pieces.length;
    if (category === 'events') offsets['offsetEvents'] = this.results.events.length;
    if (category === 'collections') offsets['offsetCollections'] = this.results.collections.length;

    this.search.searchAll(this.query, offsets).subscribe({
      next: res => {
        if (category === 'pieces') {
          this.results.pieces = [...this.results.pieces, ...(res.pieces || [])];
          this.results.totalPieces = res.totalPieces;
        } else if (category === 'events') {
          this.results.events = [...this.results.events, ...(res.events || [])];
          this.results.totalEvents = res.totalEvents;
        } else if (category === 'collections') {
          this.results.collections = [...this.results.collections, ...(res.collections || [])];
          this.results.totalCollections = res.totalCollections;
        }
        this.loadingMore[category] = false;
      },
      error: () => {
        this.loadingMore[category] = false;
      }
    });
  }

  getCollectionRef(piece: Piece): string | null {
    const ref = piece.collections?.find((c: any) => !c.singleEdition);
    if (ref) {
      return `${ref.prefix || ''}${(ref as any).collection_piece.numberInCollection}`;
    }
    return null;
  }
}
