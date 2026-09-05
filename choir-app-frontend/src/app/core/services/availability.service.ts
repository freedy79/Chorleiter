import { Injectable } from '@angular/core';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { UserAvailability } from '../models/user-availability';
import { MemberAvailability } from '../models/member-availability';
import { SKIP_GLOBAL_LOADING } from '../interceptors/loading-interceptor';

@Injectable({ providedIn: 'root' })
export class AvailabilityService {
  private apiUrl = environment.apiUrl;
  constructor(private http: HttpClient) {}

  private get noGlobalLoadingContext(): HttpContext {
    return new HttpContext().set(SKIP_GLOBAL_LOADING, true);
  }

  private buildChoirParams(choirId?: number): HttpParams | undefined {
    return choirId != null ? new HttpParams().set('choirId', choirId.toString()) : undefined;
  }

  getAvailabilities(year: number, month: number, choirId?: number): Observable<UserAvailability[]> {
    return this.http.get<UserAvailability[]>(`${this.apiUrl}/availabilities/${year}/${month}`, {
      context: this.noGlobalLoadingContext,
      params: this.buildChoirParams(choirId)
    });
  }

  setAvailability(date: string, status: string, choirId?: number): Observable<UserAvailability> {
    return this.http.put<UserAvailability>(`${this.apiUrl}/availabilities`, { date, status }, { params: this.buildChoirParams(choirId) });
  }

  getMemberAvailabilities(year: number, month: number, choirId?: number): Observable<MemberAvailability[]> {
    return this.http.get<MemberAvailability[]>(`${this.apiUrl}/availabilities/${year}/${month}/all`, {
      context: this.noGlobalLoadingContext,
      params: this.buildChoirParams(choirId)
    });
  }

  getUserAvailabilities(year: number, month: number, userId: number, choirId?: number): Observable<UserAvailability[]> {
    return this.http.get<UserAvailability[]>(`${this.apiUrl}/availabilities/${year}/${month}/user/${userId}`, {
      context: this.noGlobalLoadingContext,
      params: this.buildChoirParams(choirId)
    });
  }

  setMemberAvailability(userId: number, date: string, status: string, choirId?: number): Observable<UserAvailability> {
    return this.http.put<UserAvailability>(`${this.apiUrl}/availabilities/${userId}`, { date, status }, { params: this.buildChoirParams(choirId) });
  }
}
