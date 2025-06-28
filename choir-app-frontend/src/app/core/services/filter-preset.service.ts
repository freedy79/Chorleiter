import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { RepertoireFilter } from '../models/repertoire-filter';

@Injectable({ providedIn: 'root' })
export class FilterPresetService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getPresets(): Observable<RepertoireFilter[]> {
    return this.http.get<RepertoireFilter[]>(`${this.apiUrl}/repertoire-filters`);
  }

  savePreset(preset: { name: string; data: any; visibility: 'personal' | 'local' | 'global' }): Observable<RepertoireFilter> {
    return this.http.post<RepertoireFilter>(`${this.apiUrl}/repertoire-filters`, preset);
  }

  deletePreset(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/repertoire-filters/${id}`);
  }
}
