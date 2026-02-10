import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class ImportService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  uploadCollectionCsv(collectionId: number, file: File, mode: 'preview' | 'import'): Observable<any> {
    const formData = new FormData();
    formData.append('csvfile', file, file.name);
    const params = new HttpParams().set('mode', mode);
    return this.http.post(`${this.apiUrl}/import/collection/${collectionId}`, formData, { params });
  }

  startCollectionCsvImport(
    collectionId: number,
    file: File,
    resolutions?: Record<number, { composerId?: number; pieceId?: number; createNewPiece?: boolean }>
  ): Observable<{ jobId: string }> {
    const formData = new FormData();
    formData.append('csvfile', file, file.name);
    if (resolutions) {
      formData.append('resolutions', JSON.stringify(resolutions));
    }
    return this.http.post<{ jobId: string }>(`${this.apiUrl}/import/collection/${collectionId}`, formData);
  }

  uploadEventCsv(file: File, type: 'REHEARSAL' | 'SERVICE', mode: 'preview' | 'import'): Observable<any> {
    const formData = new FormData();
    formData.append('csvfile', file, file.name);
    const params = new HttpParams().set('mode', mode).set('type', type);
    return this.http.post(`${this.apiUrl}/import/events`, formData, { params });
  }

  startEventCsvImport(file: File, type: 'REHEARSAL' | 'SERVICE'): Observable<{ jobId: string }> {
    const formData = new FormData();
    formData.append('csvfile', file, file.name);
    const params = new HttpParams().set('type', type);
    return this.http.post<{ jobId: string }>(`${this.apiUrl}/import/events`, formData, { params });
  }

  getImportStatus(jobId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/import/status/${jobId}`);
  }
}
