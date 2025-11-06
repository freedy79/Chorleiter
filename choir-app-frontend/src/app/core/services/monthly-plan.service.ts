import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { shareReplay, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { MonthlyPlan } from '../models/monthly-plan';

@Injectable({ providedIn: 'root' })
export class MonthlyPlanService {
  private apiUrl = environment.apiUrl;
  private readonly planCache = new Map<string, Observable<MonthlyPlan | null>>();
  private readonly planIdIndex = new Map<number, string>();

  constructor(private http: HttpClient) {}

  getMonthlyPlan(year: number, month: number): Observable<MonthlyPlan | null> {
    const key = this.cacheKey(year, month);
    const cached = this.planCache.get(key);
    if (cached) {
      return cached;
    }
    const request$ = this.http.get<MonthlyPlan | null>(`${this.apiUrl}/monthly-plans/${year}/${month}`).pipe(
      tap({
        next: plan => this.setCacheEntry(year, month, plan),
        error: () => this.planCache.delete(key)
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    this.planCache.set(key, request$);
    return request$;
  }

  createMonthlyPlan(year: number, month: number): Observable<MonthlyPlan> {
    return this.http.post<MonthlyPlan>(`${this.apiUrl}/monthly-plans`, { year, month }).pipe(
      tap(plan => this.setCacheEntry(plan.year, plan.month, plan))
    );
  }

  finalizeMonthlyPlan(id: number): Observable<MonthlyPlan> {
    return this.http.put<MonthlyPlan>(`${this.apiUrl}/monthly-plans/${id}/finalize`, {}).pipe(
      tap(plan => this.setCacheEntry(plan.year, plan.month, plan))
    );
  }

  reopenMonthlyPlan(id: number): Observable<MonthlyPlan> {
    return this.http.put<MonthlyPlan>(`${this.apiUrl}/monthly-plans/${id}/reopen`, {}).pipe(
      tap(plan => this.setCacheEntry(plan.year, plan.month, plan))
    );
  }

  downloadMonthlyPlanPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/monthly-plans/${id}/pdf`, { responseType: 'blob' });
  }

  emailMonthlyPlan(id: number, recipients: number[], emails: string[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/monthly-plans/${id}/email`, { recipients, emails });
  }

  requestAvailability(id: number, recipients: number[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/monthly-plans/${id}/request-availability`, { recipients });
  }

  clearMonthlyPlanCache(year: number, month: number): void {
    const key = this.cacheKey(year, month);
    this.planCache.delete(key);
    this.removeIdMappingsForKey(key);
  }

  private cacheKey(year: number, month: number): string {
    return `${year}-${month}`;
  }

  private setCacheEntry(year: number, month: number, plan: MonthlyPlan | null): void {
    const key = this.cacheKey(year, month);
    const cached$ = of(plan).pipe(shareReplay({ bufferSize: 1, refCount: false }));
    this.planCache.set(key, cached$);
    this.removeIdMappingsForKey(key);
    if (plan) {
      this.planIdIndex.set(plan.id, key);
    }
  }

  private removeIdMappingsForKey(key: string): void {
    for (const [id, value] of Array.from(this.planIdIndex.entries())) {
      if (value === key) {
        this.planIdIndex.delete(id);
      }
    }
  }
}
