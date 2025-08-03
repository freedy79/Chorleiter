import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LibraryItem } from '../models/library-item';
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

  borrowItem(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/borrow`, {});
  }
}
