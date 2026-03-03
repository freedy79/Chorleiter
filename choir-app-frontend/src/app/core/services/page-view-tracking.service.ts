import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

interface TrackingData {
  path: string;
  category?: 'piece' | 'collection' | 'shared-piece' | 'page';
  entityId?: number;
  entityLabel?: string;
  shareToken?: string;
}

/**
 * Service for tracking page views. Sends fire-and-forget requests
 * to the backend to record usage statistics.
 */
@Injectable({ providedIn: 'root' })
export class PageViewTrackingService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Track a page view for authenticated users.
   */
  track(data: TrackingData): void {
    this.http.post(`${this.apiUrl}/page-views/track`, data)
      .subscribe({ error: () => { /* silently ignore tracking errors */ } });
  }

  /**
   * Track a page view for public/unauthenticated access (e.g. shared pieces).
   */
  trackPublic(data: TrackingData): void {
    this.http.post(`${this.apiUrl}/page-views/track-public`, data)
      .subscribe({ error: () => { /* silently ignore tracking errors */ } });
  }
}
