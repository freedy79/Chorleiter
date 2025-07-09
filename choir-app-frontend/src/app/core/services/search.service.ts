import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Piece } from '../models/piece';
import { Event } from '../models/event';
import { Collection } from '../models/collection';

@Injectable({ providedIn: 'root' })
export class SearchService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  searchAll(term: string): Observable<{ pieces: Piece[]; events: Event[]; collections: Collection[] }> {
    const params = new HttpParams().set('q', term);
    return this.http.get<{ pieces: Piece[]; events: Event[]; collections: Collection[] }>(`${this.apiUrl}/search`, { params });
  }
}
