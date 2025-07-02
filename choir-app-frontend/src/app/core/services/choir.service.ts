import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Choir } from '../models/choir';
import { UserInChoir } from '../models/user';
import { Collection } from '../models/collection';

@Injectable({ providedIn: 'root' })
export class ChoirService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getMyChoirDetails(): Observable<Choir> {
    return this.http.get<Choir>(`${this.apiUrl}/choir-management`);
  }

  updateMyChoir(choirData: { name: string; description: string; location: string }): Observable<any> {
    return this.http.put(`${this.apiUrl}/choir-management`, choirData);
  }

  getChoirMembers(): Observable<UserInChoir[]> {
    return this.http.get<UserInChoir[]>(`${this.apiUrl}/choir-management/members`);
  }

  inviteUserToChoir(email: string, roleInChoir: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/choir-management/members`, { email, roleInChoir });
  }

  removeUserFromChoir(userId: number): Observable<any> {
    const options = { body: { userId } };
    return this.http.delete(`${this.apiUrl}/choir-management/members`, options);
  }

  getChoirCollections(): Observable<Collection[]> {
    return this.http.get<Collection[]>(`${this.apiUrl}/choir-management/collections`);
  }

  removeCollectionFromChoir(collectionId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/choir-management/collections/${collectionId}`);
  }
}
