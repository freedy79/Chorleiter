import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { PlanEntry } from '../models/plan-entry';

@Injectable({ providedIn: 'root' })
export class PlanEntryService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  createPlanEntry(data: { monthlyPlanId: number; date: string; notes?: string; directorId?: number; organistId?: number }): Observable<PlanEntry> {
    return this.http.post<PlanEntry>(`${this.apiUrl}/plan-entries`, data);
  }

  updatePlanEntry(id: number, data: { date: string; notes?: string; directorId?: number; organistId?: number }): Observable<PlanEntry> {
    return this.http.put<PlanEntry>(`${this.apiUrl}/plan-entries/${id}`, data);
  }

  deletePlanEntry(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/plan-entries/${id}`);
  }
}
