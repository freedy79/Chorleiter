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

  getCopyIds(): Observable<number[]> {
    return this.http.get<number[]>(`${this.baseUrl}/copy-ids`);
  }

  initCopies(collectionId: number, copies: number): Observable<Lending[]> {
    return this.http.post<Lending[]>(`${this.baseUrl}/${collectionId}/copies`, { copies });
  }

  setCopies(collectionId: number, copies: number): Observable<Lending[]> {
    return this.http.put<Lending[]>(`${this.baseUrl}/${collectionId}/copies`, { copies });
  }

  updateCopy(id: number, data: Partial<Lending>): Observable<Lending> {
    return this.http.put<Lending>(`${environment.apiUrl}/choir-management/collections/copies/${id}`, data);
  }

  downloadCopiesPdf(collectionId: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${collectionId}/copies/pdf`, { responseType: 'blob' });
  }

  getMyBorrowings(): Observable<Lending[]> {
    return this.http.get<Lending[]>(`${environment.apiUrl}/choir-management/borrowings`);
  }
}
