import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { Collection } from '../models/collection';

@Injectable({ providedIn: 'root' })
export class CollectionService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getCollections(): Observable<Collection[]> {
    return this.http.get<Collection[]>(`${this.apiUrl}/collections`);
  }

  getCollectionById(id: number): Observable<Collection> {
    return this.http.get<Collection>(`${this.apiUrl}/collections/${id}`);
  }

  createCollection(data: any): Observable<Collection> {
    return this.http.post<Collection>(`${this.apiUrl}/collections`, data);
  }

  updateCollection(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/collections/${id}`, data);
  }

  uploadCollectionCover(id: number, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('cover', file);
    return this.http.post(`${this.apiUrl}/collections/${id}/cover`, formData);
  }

  getCollectionCover(id: number): Observable<string> {
    return this.http
      .get<{ data: string }>(`${this.apiUrl}/collections/${id}/cover`)
      .pipe(map(res => res.data));
  }

  getCollectionCoverUrl(id: number): string {
    return `${this.apiUrl}/collections/${id}/cover`;
  }

  addCollectionToChoir(collectionId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/collections/${collectionId}/addToChoir`, {});
  }
}
