import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Publisher } from '../models/publisher';

@Injectable({ providedIn: 'root' })
export class PublisherService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getPublishers(): Observable<Publisher[]> {
    return this.http.get<Publisher[]>(`${this.apiUrl}/publishers`);
  }

  createPublisher(data: { name: string }): Observable<Publisher> {
    return this.http.post<Publisher>(`${this.apiUrl}/publishers`, data);
  }

  updatePublisher(id: number, data: { name: string }): Observable<Publisher> {
    return this.http.put<Publisher>(`${this.apiUrl}/publishers/${id}`, data);
  }

  deletePublisher(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/publishers/${id}`);
  }
}
