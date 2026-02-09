import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface SearchHistoryEntry {
  id?: number;
  query: string;
  filterData?: any;
  resultCount?: number;
  timestamp?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class SearchHistoryService {
  private apiUrl = `${environment.apiUrl}/search/history`;
  private localStorageKey = 'searchHistory';
  private maxLocalEntries = 10;
  private isEnabled = true;

  constructor(private http: HttpClient) {
    this.loadSettings();
  }

  private loadSettings(): void {
    const enabled = localStorage.getItem('searchHistoryEnabled');
    this.isEnabled = enabled === null || enabled === 'true';
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    localStorage.setItem('searchHistoryEnabled', String(enabled));
    if (!enabled) {
      this.clearLocalHistory();
    }
  }

  getEnabled(): boolean {
    return this.isEnabled;
  }

  addToHistory(entry: SearchHistoryEntry): Observable<any> {
    if (!this.isEnabled || !entry.query?.trim()) {
      return of(null);
    }

    this.addToLocalHistory(entry);

    return this.http.post(this.apiUrl, entry).pipe(
      catchError(err => {
        console.warn('Failed to save search to backend:', err);
        return of(null);
      })
    );
  }

  getHistory(limit: number = 20): Observable<SearchHistoryEntry[]> {
    if (!this.isEnabled) {
      return of([]);
    }

    const params = new HttpParams().set('limit', limit.toString());

    return this.http.get<SearchHistoryEntry[]>(this.apiUrl, { params }).pipe(
      catchError(err => {
        console.warn('Failed to load search history from backend:', err);
        return of(this.getLocalHistory());
      })
    );
  }

  removeEntry(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  clearHistory(): Observable<any> {
    this.clearLocalHistory();
    return this.http.delete(this.apiUrl).pipe(
      catchError(err => {
        console.warn('Failed to clear backend history:', err);
        return of(null);
      })
    );
  }

  private addToLocalHistory(entry: SearchHistoryEntry): void {
    const history = this.getLocalHistory();
    const normalized = entry.query.toLowerCase().trim();

    const filtered = history.filter(
      h => h.query.toLowerCase().trim() !== normalized
    );

    filtered.unshift({
      query: entry.query,
      timestamp: new Date(),
      filterData: entry.filterData,
      resultCount: entry.resultCount
    });

    const trimmed = filtered.slice(0, this.maxLocalEntries);
    localStorage.setItem(this.localStorageKey, JSON.stringify(trimmed));
  }

  private getLocalHistory(): SearchHistoryEntry[] {
    try {
      const stored = localStorage.getItem(this.localStorageKey);
      if (!stored) return [];

      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private clearLocalHistory(): void {
    localStorage.removeItem(this.localStorageKey);
  }

  getCombinedHistory(limit: number = 10): Observable<SearchHistoryEntry[]> {
    if (!this.isEnabled) {
      return of([]);
    }

    return this.getHistory(limit).pipe(
      tap(backendHistory => {
        if (!backendHistory?.length) {
          // Fallback to local history handled in catchError of getHistory
        }
      })
    );
  }
}
