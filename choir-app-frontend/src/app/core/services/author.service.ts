import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Author } from '../models/author';
import { CreatorService } from './creator.service';

@Injectable({ providedIn: 'root' })
export class AuthorService extends CreatorService<Author> {
  constructor(http: HttpClient) { super(http, 'authors'); }

  getAuthors(): Observable<Author[]> { return this.getAll(); }
  createAuthor(data: { name: string; birthYear?: string; deathYear?: string }, force = false): Observable<Author> {
    return this.create(data, force);
  }
  updateAuthor(id: number, data: { name: string; birthYear?: string; deathYear?: string }, force = false): Observable<Author> {
    return this.update(id, data, force);
  }
  deleteAuthor(id: number): Observable<any> { return this.delete(id); }
  enrichAuthor(id: number): Observable<Author> { return this.enrich(id); }
}
