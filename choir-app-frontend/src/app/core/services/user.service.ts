import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { User } from '../models/user';

@Injectable({ providedIn: 'root' })
export class UserService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/me`);
  }

  updateCurrentUser(profileData: { name?: string; email?: string; password?: string }): Observable<any> {
    return this.http.put(`${this.apiUrl}/users/me`, profileData);
  }

  getInvitation(token: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/invitations/${token}`);
  }

  requestPasswordReset(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/password-reset/request`, { email });
  }

  resetPassword(token: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/password-reset/reset/${token}`, { password });
  }

  completeRegistration(token: string, data: { name: string; password: string; isOrganist?: boolean }): Observable<any> {
    return this.http.post(`${this.apiUrl}/invitations/${token}`, data);
  }

  registerDonation(): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/me/donate`, {});
  }
}
