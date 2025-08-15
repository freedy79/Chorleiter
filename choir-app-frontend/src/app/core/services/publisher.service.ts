import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Publisher } from '../models/publisher';
import { CreatorService } from './creator.service';

@Injectable({ providedIn: 'root' })
export class PublisherService extends CreatorService<Publisher> {
  constructor(http: HttpClient) { super(http, 'publishers'); }

  getPublishers(): Observable<Publisher[]> { return this.getAll(); }

  createPublisher(data: { name: string }, force = false): Observable<Publisher> {
    return this.create(data, force);
  }

  updatePublisher(id: number, data: { name: string }, force = false): Observable<Publisher> {
    return this.update(id, data, force);
  }

  deletePublisher(id: number): Observable<any> { return this.delete(id); }
}
