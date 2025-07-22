import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Composer } from '../models/composer';
import { CreatorService } from './creator.service';

@Injectable({ providedIn: 'root' })
export class ComposerService extends CreatorService<Composer> {
  constructor(http: HttpClient) { super(http, 'composers'); }

  getComposers(): Observable<Composer[]> { return this.getAll(); }
  createComposer(data: { name: string; birthYear?: string; deathYear?: string }, force = false): Observable<Composer> {
    return this.create(data, force);
  }
  updateComposer(id: number, data: { name: string; birthYear?: string; deathYear?: string }, force = false): Observable<Composer> {
    return this.update(id, data, force);
  }
  deleteComposer(id: number): Observable<any> { return this.delete(id); }
  enrichComposer(id: number): Observable<Composer> { return this.enrich(id); }
}
