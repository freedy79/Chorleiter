import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { PlanRule } from '../models/plan-rule';

@Injectable({ providedIn: 'root' })
export class PlanRuleService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getPlanRules(choirId?: number): Observable<PlanRule[]> {
    const params = choirId ? new HttpParams().set('choirId', choirId.toString()) : undefined;
    return this.http.get<PlanRule[]>(`${this.apiUrl}/plan-rules`, { params });
  }

  createPlanRule(data: { dayOfWeek: number; weeks?: number[] | null; notes?: string | null }): Observable<PlanRule> {
    return this.http.post<PlanRule>(`${this.apiUrl}/plan-rules`, data);
  }

  updatePlanRule(id: number, data: { dayOfWeek: number; weeks?: number[] | null; notes?: string | null }): Observable<PlanRule> {
    return this.http.put<PlanRule>(`${this.apiUrl}/plan-rules/${id}`, data);
  }

  deletePlanRule(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/plan-rules/${id}`);
  }
}
