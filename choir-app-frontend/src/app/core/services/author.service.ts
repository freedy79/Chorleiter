import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Author } from '../models/author';

@Injectable({ providedIn: 'root' })
export class AuthorService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getAuthors(): Observable<Author[]> {
    return this.http.get<Author[]>(`${this.apiUrl}/authors`);
  }

  createAuthor(data: { name: string; birthYear?: string; deathYear?: string }): Observable<Author> {
    return this.http.post<Author>(`${this.apiUrl}/authors`, data);
  }

  updateAuthor(id: number, data: { name: string; birthYear?: string; deathYear?: string }): Observable<Author> {
    return this.http.put<Author>(`${this.apiUrl}/authors/${id}`, data);
  }

  deleteAuthor(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/authors/${id}`);
  }

  enrichAuthor(id: number): Observable<Author> {
    return this.http.post<Author>(`${this.apiUrl}/authors/${id}/enrich`, {});
  }
}
