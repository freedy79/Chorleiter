import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LibraryItem } from '../models/library-item';
import { PhysicalCopy } from '../models/physical-copy';
import { DigitalLicense } from '../models/digital-license';
import { LoanRequestPayload } from '../models/loan-request';
import { Loan } from '../models/loan';
import { Lending } from '../models/lending';
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

  getCurrentLoans(): Observable<Loan[]> {
    return this.http.get<Loan[]>(`${this.apiUrl}/loans/current`);
  }

  updateLoan(id: number, data: Partial<Loan>): Observable<any> {
    return this.http.put(`${this.apiUrl}/loans/${id}`, data);
  }

  endLoan(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/loans/${id}/end`, {});
  }

  getCopies(itemId: number): Observable<Lending[]> {
    return this.http.get<Lending[]>(`${this.apiUrl}/${itemId}/copies`);
  }

  updateCopy(id: number, data: Partial<Lending>): Observable<Lending> {
    return this.http.put<Lending>(`${this.apiUrl}/copies/${id}`, data);
  }

  downloadCopiesPdf(itemId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${itemId}/copies/pdf`, { responseType: 'blob' });
  }

  // Physical copies
  getPhysicalCopies(itemId: number): Observable<PhysicalCopy[]> {
    return this.http.get<PhysicalCopy[]>(`${this.apiUrl}/${itemId}/physical-copies`);
  }

  createPhysicalCopy(itemId: number, data: Partial<PhysicalCopy>): Observable<PhysicalCopy> {
    return this.http.post<PhysicalCopy>(`${this.apiUrl}/${itemId}/physical-copies`, data);
  }

  updatePhysicalCopy(copyId: number, data: Partial<PhysicalCopy>): Observable<PhysicalCopy> {
    return this.http.put<PhysicalCopy>(`${this.apiUrl}/physical-copies/${copyId}`, data);
  }

  deletePhysicalCopy(copyId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/physical-copies/${copyId}`);
  }

  // Digital licenses
  getDigitalLicenses(itemId: number): Observable<DigitalLicense[]> {
    return this.http.get<DigitalLicense[]>(`${this.apiUrl}/${itemId}/digital-licenses`);
  }

  createDigitalLicense(itemId: number, data: Partial<DigitalLicense>): Observable<DigitalLicense> {
    return this.http.post<DigitalLicense>(`${this.apiUrl}/${itemId}/digital-licenses`, data);
  }

  updateDigitalLicense(licenseId: number, data: Partial<DigitalLicense>): Observable<DigitalLicense> {
    return this.http.put<DigitalLicense>(`${this.apiUrl}/digital-licenses/${licenseId}`, data);
  }

  deleteDigitalLicense(licenseId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/digital-licenses/${licenseId}`);
  }
}
