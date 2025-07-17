import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Composer } from '../models/composer';

@Injectable({ providedIn: 'root' })
export class ComposerService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getComposers(): Observable<Composer[]> {
    return this.http.get<Composer[]>(`${this.apiUrl}/composers`);
  }

  createComposer(data: { name: string; birthYear?: string; deathYear?: string }, force = false): Observable<Composer> {
    const url = force ? `${this.apiUrl}/composers?force=true` : `${this.apiUrl}/composers`;
    return this.http.post<Composer>(url, data);
  }

  updateComposer(id: number, data: { name: string; birthYear?: string; deathYear?: string }, force = false): Observable<Composer> {
    const url = force ? `${this.apiUrl}/composers/${id}?force=true` : `${this.apiUrl}/composers/${id}`;
    return this.http.put<Composer>(url, data);
  }

  deleteComposer(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/composers/${id}`);
  }

  enrichComposer(id: number): Observable<Composer> {
    return this.http.post<Composer>(`${this.apiUrl}/composers/${id}/enrich`, {});
  }
}
