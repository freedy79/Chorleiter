import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Lending } from '../models/lending';
import { ChoirDigitalLicense } from '../models/choir-digital-license';

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

  getDigitalLicenses(collectionId: number): Observable<ChoirDigitalLicense[]> {
    return this.http.get<ChoirDigitalLicense[]>(`${this.baseUrl}/${collectionId}/digital-licenses`);
  }

  getViewableDigitalLicenses(collectionId: number): Observable<ChoirDigitalLicense[]> {
    return this.http.get<ChoirDigitalLicense[]>(`${this.baseUrl}/${collectionId}/digital-licenses/viewable`);
  }

  createDigitalLicense(collectionId: number, data: Partial<ChoirDigitalLicense>): Observable<ChoirDigitalLicense> {
    return this.http.post<ChoirDigitalLicense>(`${this.baseUrl}/${collectionId}/digital-licenses`, data);
  }

  updateDigitalLicense(licenseId: number, data: Partial<ChoirDigitalLicense>): Observable<ChoirDigitalLicense> {
    return this.http.put<ChoirDigitalLicense>(`${this.baseUrl}/digital-licenses/${licenseId}`, data);
  }

  deleteDigitalLicense(licenseId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/digital-licenses/${licenseId}`);
  }

  uploadDigitalLicenseDocument(licenseId: number, file: File): Observable<ChoirDigitalLicense> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ChoirDigitalLicense>(`${this.baseUrl}/digital-licenses/${licenseId}/document`, formData);
  }

  downloadDigitalLicenseDocument(licenseId: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/digital-licenses/${licenseId}/document`, { responseType: 'blob' });
  }

  getDigitalLicenseInlineViewUrl(licenseId: number): string {
    return `${this.baseUrl}/digital-licenses/${licenseId}/document/view`;
  }

  getMyBorrowings(): Observable<Lending[]> {
    return this.http.get<Lending[]>(`${environment.apiUrl}/choir-management/borrowings`);
  }
}
