import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { Choir, normalizeChoir, normalizeMembers } from '../models/choir';
import { DashboardContact } from '../models/dashboard-contact';
import { UserInChoir } from '../models/user';
import { Collection } from '../models/collection';
import { ChoirLog } from '../models/choir-log';
import { ChoirPublicPage, PublicChoirPageResponse, SlugAvailabilityResponse } from '../models/choir-public-page';

@Injectable({ providedIn: 'root' })
export class ChoirService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getMyChoirDetails(choirId?: number): Observable<Choir> {
    const params = choirId ? new HttpParams().set('choirId', choirId.toString()) : undefined;
    return this.http.get<Choir>(`${this.apiUrl}/choir-management`, { params })
      .pipe(map(choir => normalizeChoir(choir) ?? choir));
  }

  updateMyChoir(choirData: Partial<Choir>, choirId?: number): Observable<any> {
    const params = choirId ? new HttpParams().set('choirId', choirId.toString()) : undefined;
    return this.http.put(`${this.apiUrl}/choir-management`, choirData, { params });
  }

  getChoirMembers(choirId?: number): Observable<UserInChoir[]> {
    const params = choirId ? new HttpParams().set('choirId', choirId.toString()) : undefined;
    return this.http.get<UserInChoir[]>(`${this.apiUrl}/choir-management/members`, { params })
      .pipe(map(members => normalizeMembers(members)));
  }

  getChoirMemberCount(choirId?: number): Observable<number> {
    const params = choirId ? new HttpParams().set('choirId', choirId.toString()) : undefined;
    return this.http
      .get<{ count: number }>(`${this.apiUrl}/choir-management/members/count`, { params })
      .pipe(map(res => res.count));
  }

  getDashboardContacts(choirId?: number): Observable<DashboardContact[]> {
    const params = choirId ? new HttpParams().set('choirId', choirId.toString()) : undefined;
    return this.http.get<DashboardContact[]>(`${this.apiUrl}/choir-management/dashboard-contact`, { params });
  }

  inviteUserToChoir(email: string, rolesInChoir: string[], choirId?: number): Observable<{ message: string }> {
    const params = choirId ? new HttpParams().set('choirId', choirId.toString()) : undefined;
    return this.http.post<{ message: string }>(`${this.apiUrl}/choir-management/members`, { email, rolesInChoir }, { params });
  }

  updateMember(userId: number, data: { rolesInChoir?: string[] }, choirId?: number): Observable<any> {
    const params = choirId ? new HttpParams().set('choirId', choirId.toString()) : undefined;
    return this.http.put(`${this.apiUrl}/choir-management/members/${userId}`, data, { params });
  }

  removeUserFromChoir(userId: number, choirId?: number): Observable<any> {
    const params = choirId ? new HttpParams().set('choirId', choirId.toString()) : undefined;
    const options = { params, body: { userId } };
    return this.http.delete(`${this.apiUrl}/choir-management/members`, options);
  }

  getChoirCollections(choirId?: number): Observable<Collection[]> {
    const params = choirId ? new HttpParams().set('choirId', choirId.toString()) : undefined;
    return this.http.get<Collection[]>(`${this.apiUrl}/choir-management/collections`, { params });
  }

  removeCollectionFromChoir(collectionId: number, choirId?: number): Observable<any> {
    const params = choirId ? new HttpParams().set('choirId', choirId.toString()) : undefined;
    return this.http.delete(`${this.apiUrl}/choir-management/collections/${collectionId}`, { params });
  }

  getChoirLogs(choirId?: number): Observable<ChoirLog[]> {
    const params = choirId ? new HttpParams().set('choirId', choirId.toString()) : undefined;
    return this.http.get<ChoirLog[]>(`${this.apiUrl}/choir-management/logs`, { params });
  }

  downloadParticipationPdf(choirId?: number, startDate?: Date | string, endDate?: Date | string): Observable<Blob> {
    let params = new HttpParams();
    if (choirId) params = params.set('choirId', choirId.toString());
    if (startDate) {
      params = params.set('startDate', startDate instanceof Date ? startDate.toISOString() : startDate);
    }
    if (endDate) {
      params = params.set('endDate', endDate instanceof Date ? endDate.toISOString() : endDate);
    }
    return this.http.get(`${this.apiUrl}/choir-management/participation/pdf`, { params, responseType: 'blob' });
  }

  getMyPublicPage(choirId?: number): Observable<ChoirPublicPage> {
    const params = choirId ? new HttpParams().set('choirId', choirId.toString()) : undefined;
    return this.http.get<ChoirPublicPage>(`${this.apiUrl}/choir-management/public-page`, { params });
  }

  updateMyPublicPage(data: Partial<ChoirPublicPage>, choirId?: number): Observable<{ message: string; page: ChoirPublicPage }> {
    const params = choirId ? new HttpParams().set('choirId', choirId.toString()) : undefined;
    return this.http.put<{ message: string; page: ChoirPublicPage }>(`${this.apiUrl}/choir-management/public-page`, data, { params });
  }

  checkPublicPageSlugAvailability(slug: string, choirId?: number): Observable<SlugAvailabilityResponse> {
    let params = new HttpParams().set('slug', slug);
    if (choirId) {
      params = params.set('choirId', choirId.toString());
    }
    return this.http.get<SlugAvailabilityResponse>(`${this.apiUrl}/choir-management/public-page/slug-availability`, { params });
  }

  uploadPublicPageAsset(file: File, choirId?: number, sortOrder = 0, altText?: string): Observable<any> {
    const form = new FormData();
    form.append('file', file);
    form.append('sortOrder', String(sortOrder));
    if (altText) {
      form.append('altText', altText);
    }
    const params = choirId ? new HttpParams().set('choirId', choirId.toString()) : undefined;
    return this.http.post(`${this.apiUrl}/choir-management/public-page/assets`, form, { params });
  }

  deletePublicPageAsset(assetId: number, choirId?: number): Observable<{ message: string }> {
    const params = choirId ? new HttpParams().set('choirId', choirId.toString()) : undefined;
    return this.http.delete<{ message: string }>(`${this.apiUrl}/choir-management/public-page/assets/${assetId}`, { params });
  }

  getPublicPageBySlug(slug: string): Observable<PublicChoirPageResponse> {
    return this.http.get<PublicChoirPageResponse>(`${this.apiUrl}/public/choirs/${encodeURIComponent(slug)}`);
  }
}
