import { Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
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

  getAvailabilities(year: number, month: number): Observable<UserAvailability[]> {
    return this.http.get<UserAvailability[]>(`${this.apiUrl}/availabilities/${year}/${month}`, {
      context: this.noGlobalLoadingContext
    });
  }

  setAvailability(date: string, status: string): Observable<UserAvailability> {
    return this.http.put<UserAvailability>(`${this.apiUrl}/availabilities`, { date, status });
  }

  getMemberAvailabilities(year: number, month: number): Observable<MemberAvailability[]> {
    return this.http.get<MemberAvailability[]>(`${this.apiUrl}/availabilities/${year}/${month}/all`, {
      context: this.noGlobalLoadingContext
    });
  }

  getUserAvailabilities(year: number, month: number, userId: number): Observable<UserAvailability[]> {
    return this.http.get<UserAvailability[]>(`${this.apiUrl}/availabilities/${year}/${month}/user/${userId}`, {
      context: this.noGlobalLoadingContext
    });
  }

  setMemberAvailability(userId: number, date: string, status: string): Observable<UserAvailability> {
    return this.http.put<UserAvailability>(`${this.apiUrl}/availabilities/${userId}`, { date, status });
  }
}
