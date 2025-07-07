import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { UserAvailability } from '../models/user-availability';
import { MemberAvailability } from '../models/member-availability';

@Injectable({ providedIn: 'root' })
export class AvailabilityService {
  private apiUrl = environment.apiUrl;
  constructor(private http: HttpClient) {}

  getAvailabilities(year: number, month: number): Observable<UserAvailability[]> {
    return this.http.get<UserAvailability[]>(`${this.apiUrl}/availabilities/${year}/${month}`);
  }

  setAvailability(date: string, status: string): Observable<UserAvailability> {
    return this.http.put<UserAvailability>(`${this.apiUrl}/availabilities`, { date, status });
  }

  getMemberAvailabilities(year: number, month: number): Observable<MemberAvailability[]> {
    return this.http.get<MemberAvailability[]>(`${this.apiUrl}/availabilities/${year}/${month}/all`);
  }
}
