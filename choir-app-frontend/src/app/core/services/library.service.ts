import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LibraryItem } from '../models/library-item';
import { LoanRequestPayload } from '../models/loan-request';
import { Loan } from '../models/loan';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class LibraryService {
  private apiUrl = `${environment.apiUrl}/library`;

  constructor(private http: HttpClient) {}

  getLibraryItems(): Observable<LibraryItem[]> {
    return this.http.get<LibraryItem[]>(this.apiUrl);
  }

  importCsv(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('csvfile', file);
    return this.http.post(`${this.apiUrl}/import`, formData);
  }

  addItem(data: { collectionId: number; copies: number; isBorrowed?: boolean }): Observable<LibraryItem> {
    return this.http.post<LibraryItem>(this.apiUrl, data);
  }

  borrowItem(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/borrow`, {});
  }

  returnItem(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/return`, {});
  }

  updateItem(id: number, data: Partial<LibraryItem>): Observable<LibraryItem> {
    return this.http.put<LibraryItem>(`${this.apiUrl}/${id}`, data);
  }

  deleteItem(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  requestLoan(data: LoanRequestPayload): Observable<any> {
    return this.http.post(`${this.apiUrl}/request`, data);
  }

  getLoans(): Observable<Loan[]> {
    return this.http.get<Loan[]>(`${this.apiUrl}/loans`);
  }
}
