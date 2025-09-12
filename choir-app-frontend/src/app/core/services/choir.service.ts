import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Choir } from '../models/choir';
import { UserInChoir } from '../models/user';
import { Collection } from '../models/collection';
import { ChoirLog } from '../models/choir-log';

@Injectable({ providedIn: 'root' })
export class ChoirService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getMyChoirDetails(choirId?: number): Observable<Choir> {
    const params = choirId ? new HttpParams().set('choirId', choirId.toString()) : undefined;
    return this.http.get<Choir>(`${this.apiUrl}/choir-management`, { params });
  }

  updateMyChoir(choirData: Partial<Choir>, choirId?: number): Observable<any> {
    const params = choirId ? new HttpParams().set('choirId', choirId.toString()) : undefined;
    return this.http.put(`${this.apiUrl}/choir-management`, choirData, { params });
  }

  getChoirMembers(choirId?: number): Observable<UserInChoir[]> {
    const params = choirId ? new HttpParams().set('choirId', choirId.toString()) : undefined;
    return this.http.get<UserInChoir[]>(`${this.apiUrl}/choir-management/members`, { params });
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
}
