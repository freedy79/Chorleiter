import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Lending } from '../models/lending';

@Injectable({ providedIn: 'root' })
export class ChoirLendingService {
  private baseUrl = `${environment.apiUrl}/choir-management/collections`;

  constructor(private http: HttpClient) {}

  getCopies(collectionId: number): Observable<Lending[]> {
    return this.http.get<Lending[]>(`${this.baseUrl}/${collectionId}/copies`);
  }

  initCopies(collectionId: number, copies: number): Observable<Lending[]> {
    return this.http.post<Lending[]>(`${this.baseUrl}/${collectionId}/copies`, { copies });
  }

  updateCopy(id: number, data: Partial<Lending>): Observable<Lending> {
    return this.http.put<Lending>(`${environment.apiUrl}/choir-management/collections/copies/${id}`, data);
  }
}
