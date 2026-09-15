import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface GifSearchItem {
  id: string;
  title: string;
  url: string;
  previewUrl: string;
}

type TenorMediaVariant = {
  url?: string;
};

type TenorResult = {
  id?: string;
  content_description?: string;
  media_formats?: {
    gif?: TenorMediaVariant;
    tinygif?: TenorMediaVariant;
  };
};

type TenorResponse = {
  results?: TenorResult[];
};

@Injectable({ providedIn: 'root' })
export class GifSearchService {
  // Public beta/demo key from Tenor docs for client-side integrations.
  // Can be replaced later by a project-specific key.
  private readonly apiKey = 'LIVDSRZULELA';
  private readonly clientKey = 'chorleiter_web';
  private readonly baseUrl = 'https://tenor.googleapis.com/v2';

  constructor(private http: HttpClient) {}

  search(query: string, limit = 24): Observable<GifSearchItem[]> {
    const normalized = String(query || '').trim();
    if (!normalized) return this.trending(limit);

    const params = this.createBaseParams(limit)
      .set('q', normalized)
      .set('random', 'false');

    return this.http.get<TenorResponse>(`${this.baseUrl}/search`, { params }).pipe(
      map(response => this.toItems(response))
    );
  }

  trending(limit = 24): Observable<GifSearchItem[]> {
    const params = this.createBaseParams(limit);

    return this.http.get<TenorResponse>(`${this.baseUrl}/featured`, { params }).pipe(
      map(response => this.toItems(response))
    );
  }

  private createBaseParams(limit: number): HttpParams {
    return new HttpParams()
      .set('key', this.apiKey)
      .set('client_key', this.clientKey)
      .set('limit', String(Math.min(Math.max(limit, 1), 50)))
      .set('media_filter', 'gif,tinygif')
      .set('contentfilter', 'medium')
      .set('locale', 'de_DE');
  }

  private toItems(response: TenorResponse): GifSearchItem[] {
    const rows = response?.results || [];
    const mapped = rows
      .map(result => {
        const gifUrl = result.media_formats?.gif?.url || '';
        const tinyUrl = result.media_formats?.tinygif?.url || gifUrl;
        if (!gifUrl) return null;

        return {
          id: result.id || gifUrl,
          title: result.content_description || 'GIF',
          url: gifUrl,
          previewUrl: tinyUrl
        } as GifSearchItem;
      })
      .filter((item): item is GifSearchItem => !!item);

    return mapped;
  }
}
