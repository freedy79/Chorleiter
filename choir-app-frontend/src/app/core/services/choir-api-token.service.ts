import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export type ChoirApiTokenScope =
  | 'events:read'
  | 'repertoire:read'
  | 'search:read'
  | 'plan:read'
  | 'stats:read'
  | 'events:write';

export interface ChoirApiToken {
  id: number;
  label: string;
  tokenPrefix: string;
  scopes: ChoirApiTokenScope[];
  allowWrite: boolean;
  expiresAt: string;
  lastUsedAt: string | null;
  lastUsedIp: string | null;
  usageCount: number;
  writeCount: number;
  renewedAt: string | null;
  renewCount: number;
  revokedAt: string | null;
  createdAt: string;
  active: boolean;
}

/** Only returned on create/rotate - the secret is never retrievable again. */
export interface ChoirApiTokenSecret extends ChoirApiToken {
  token: string;
}

export interface ChoirApiTokenList {
  tokens: ChoirApiToken[];
  limits: { maxDays: number; maxPerChoir: number; writeEnabled: boolean };
  availableScopes: ChoirApiTokenScope[];
}

export interface CreateChoirApiTokenRequest {
  label: string;
  scopes: ChoirApiTokenScope[];
  validDays: number;
  allowWrite: boolean;
}

@Injectable({ providedIn: 'root' })
export class ChoirApiTokenService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/choir-api-tokens`;

  list(): Observable<ChoirApiTokenList> {
    return this.http.get<ChoirApiTokenList>(this.baseUrl);
  }

  create(request: CreateChoirApiTokenRequest): Observable<ChoirApiTokenSecret> {
    return this.http.post<ChoirApiTokenSecret>(this.baseUrl, request);
  }

  renew(id: number, validDays: number): Observable<ChoirApiToken> {
    return this.http.post<ChoirApiToken>(`${this.baseUrl}/${id}/renew`, { validDays });
  }

  rotate(id: number): Observable<ChoirApiTokenSecret> {
    return this.http.post<ChoirApiTokenSecret>(`${this.baseUrl}/${id}/rotate`, {});
  }

  revoke(id: number): Observable<ChoirApiToken> {
    return this.http.delete<ChoirApiToken>(`${this.baseUrl}/${id}`);
  }
}
