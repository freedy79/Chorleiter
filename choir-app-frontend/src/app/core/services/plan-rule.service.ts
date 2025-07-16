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

  createPlanRule(
    data: { dayOfWeek: number; weeks?: number[] | null; notes?: string | null },
    choirId?: number
  ): Observable<PlanRule> {
    const params = choirId ? new HttpParams().set('choirId', choirId.toString()) : undefined;
    return this.http.post<PlanRule>(`${this.apiUrl}/plan-rules`, data, { params });
  }

  updatePlanRule(
    id: number,
    data: { dayOfWeek: number; weeks?: number[] | null; notes?: string | null },
    choirId?: number
  ): Observable<PlanRule> {
    const params = choirId ? new HttpParams().set('choirId', choirId.toString()) : undefined;
    return this.http.put<PlanRule>(`${this.apiUrl}/plan-rules/${id}`, data, { params });
  }

  deletePlanRule(id: number, choirId?: number): Observable<any> {
    const params = choirId ? new HttpParams().set('choirId', choirId.toString()) : undefined;
    return this.http.delete(`${this.apiUrl}/plan-rules/${id}`, { params });
  }
}
