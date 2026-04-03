import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { finalize, shareReplay, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { Piece } from '../models/piece';
import { Event } from '../models/event';
import { Collection } from '../models/collection';

export interface ComposerPieces {
  composer: { id: number; name: string };
  pieces: Piece[];
}

export interface PublisherCollections {
  publisher: { id: number | null; name: string };
  collections: Collection[];
}

export interface SearchAllResult {
  pieces: Piece[];
  totalPieces: number;
  events: Event[];
  totalEvents: number;
  collections: Collection[];
  totalCollections: number;
  composerPieces: ComposerPieces[];
  publisherCollections: PublisherCollections[];
}

@Injectable({ providedIn: 'root' })
export class SearchService {
  private apiUrl = environment.apiUrl;
  private suggestionsCache = new Map<string, { expiresAt: number; data: SearchSuggestionsResponse }>();
  private inFlightSuggestions = new Map<string, Observable<SearchSuggestionsResponse>>();
  private suggestionsTtlMs = 5 * 60 * 1000;

  constructor(private http: HttpClient) {}

  searchAll(term: string, offsets?: { offsetPieces?: number; offsetEvents?: number; offsetCollections?: number }): Observable<SearchAllResult> {
    let params = new HttpParams().set('q', term);
    if (offsets?.offsetPieces) params = params.set('offsetPieces', offsets.offsetPieces.toString());
    if (offsets?.offsetEvents) params = params.set('offsetEvents', offsets.offsetEvents.toString());
    if (offsets?.offsetCollections) params = params.set('offsetCollections', offsets.offsetCollections.toString());
    return this.http.get<SearchAllResult>(`${this.apiUrl}/search`, { params });
  }

  searchSuggestions(query: string, type?: SearchSuggestionType | null): Observable<SearchSuggestionsResponse> {
    const trimmed = query?.trim();
    if (!trimmed) return of({ suggestions: [], total: 0 });

    const key = `${type || 'all'}::${trimmed.toLowerCase()}`;
    const cached = this.suggestionsCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return of(cached.data);
    }

    const existing = this.inFlightSuggestions.get(key);
    if (existing) return existing;

    let params = new HttpParams().set('q', trimmed);
    if (type) params = params.set('type', type);

    const request$ = this.http.get<SearchSuggestionsResponse>(`${this.apiUrl}/search/suggestions`, { params }).pipe(
      tap(res => {
        this.suggestionsCache.set(key, { data: res, expiresAt: Date.now() + this.suggestionsTtlMs });
      }),
      finalize(() => this.inFlightSuggestions.delete(key)),
      shareReplay(1)
    );

    this.inFlightSuggestions.set(key, request$);
    return request$;
  }
}

export type SearchSuggestionType = 'piece' | 'composer' | 'collection' | 'category' | 'author' | 'publisher';

export interface SearchSuggestion {
  id: number;
  text: string;
  type: SearchSuggestionType;
  subtitle?: string | null;
  metadata?: { [key: string]: any } | null;
}

export interface SearchSuggestionsResponse {
  suggestions: SearchSuggestion[];
  total: number;
}
