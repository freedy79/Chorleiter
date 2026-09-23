import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface OAuthConsentInfo {
  client: { name: string; uri: string | null };
  redirectUri: string;
  scopes: string[];
  allowWrite: boolean;
  choirs: Array<{ id: number; name: string }>;
  maxDays: number;
}

@Injectable({ providedIn: 'root' })
export class OAuthConsentService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/oauth`;

  getConsentInfo(query: Record<string, string>): Observable<OAuthConsentInfo> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value) params = params.set(key, value);
    }
    return this.http.get<OAuthConsentInfo>(`${this.baseUrl}/consent-info`, { params });
  }

  decide(body: Record<string, unknown>): Observable<{ redirectTo: string }> {
    return this.http.post<{ redirectTo: string }>(`${this.baseUrl}/authorize`, body);
  }
}
