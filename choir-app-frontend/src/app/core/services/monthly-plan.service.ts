import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { MonthlyPlan } from '../models/monthly-plan';

@Injectable({ providedIn: 'root' })
export class MonthlyPlanService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getMonthlyPlan(year: number, month: number): Observable<MonthlyPlan | null> {
    return this.http.get<MonthlyPlan | null>(`${this.apiUrl}/monthly-plans/${year}/${month}`);
  }

  createMonthlyPlan(year: number, month: number): Observable<MonthlyPlan> {
    return this.http.post<MonthlyPlan>(`${this.apiUrl}/monthly-plans`, { year, month });
  }

  finalizeMonthlyPlan(id: number): Observable<MonthlyPlan> {
    return this.http.put<MonthlyPlan>(`${this.apiUrl}/monthly-plans/${id}/finalize`, {});
  }

  reopenMonthlyPlan(id: number): Observable<MonthlyPlan> {
    return this.http.put<MonthlyPlan>(`${this.apiUrl}/monthly-plans/${id}/reopen`, {});
  }

  downloadMonthlyPlanPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/monthly-plans/${id}/pdf`, { responseType: 'blob' });
  }

  emailMonthlyPlan(id: number, recipients: number[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/monthly-plans/${id}/email`, { recipients });
  }
}
