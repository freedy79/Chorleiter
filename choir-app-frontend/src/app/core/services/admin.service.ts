import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Choir } from '../models/choir';
import { User, UserInChoir } from '../models/user';
import { LoginAttempt } from '../models/login-attempt';
import { StatsSummary } from '../models/stats-summary';
import { MailSettings } from '../models/mail-settings';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getAdminChoirs(): Observable<Choir[]> {
    return this.http.get<Choir[]>(`${this.apiUrl}/admin/choirs`);
  }

  createChoir(data: { name: string; description?: string; location?: string }): Observable<Choir> {
    return this.http.post<Choir>(`${this.apiUrl}/admin/choirs`, data);
  }

  updateChoir(id: number, data: { name: string; description?: string; location?: string }): Observable<Choir> {
    return this.http.put<Choir>(`${this.apiUrl}/admin/choirs/${id}`, data);
  }

  deleteChoir(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin/choirs/${id}`);
  }

  getChoirMembersAdmin(id: number): Observable<UserInChoir[]> {
    return this.http.get<UserInChoir[]>(`${this.apiUrl}/admin/choirs/${id}/members`);
  }

  inviteUserToChoirAdmin(id: number, email: string, roleInChoir: string, isOrganist?: boolean): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/admin/choirs/${id}/members`, { email, roleInChoir, isOrganist });
  }

  updateChoirMemberAdmin(id: number, userId: number, data: { roleInChoir?: string; isOrganist?: boolean }): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/choirs/${id}/members/${userId}`, data);
  }

  removeUserFromChoirAdmin(id: number, userId: number): Observable<any> {
    const options = { body: { userId } };
    return this.http.delete(`${this.apiUrl}/admin/choirs/${id}/members`, options);
  }

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/admin/users`);
  }

  getUserByEmail(email: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/admin/users/email/${encodeURIComponent(email)}`);
  }

  createUser(data: any): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/admin/users`, data);
  }

  updateUser(id: number, data: any): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/admin/users/${id}`, data);
  }

  deleteUser(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin/users/${id}`);
  }

  sendPasswordReset(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/users/${id}/send-password-reset`, {});
  }

  getLoginAttempts(): Observable<LoginAttempt[]> {
    return this.http.get<LoginAttempt[]>(`${this.apiUrl}/admin/login-attempts`);
  }

  listLogs(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/admin/logs`);
  }

  getLog(filename: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/admin/logs/${encodeURIComponent(filename)}`);
  }

  downloadBackup(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/backup/export`, { responseType: 'blob' });
  }

  restoreBackup(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('backup', file);
    return this.http.post(`${this.apiUrl}/backup/import`, formData);
  }

  checkChoirAdminStatus(): Observable<{ isChoirAdmin: boolean }> {
    return this.http.get<{ isChoirAdmin: boolean }>(`${this.apiUrl}/auth/check-choir-admin`);
  }

  getStatistics(): Observable<StatsSummary> {
    return this.http.get<StatsSummary>(`${this.apiUrl}/stats`);
  }

  getMailSettings(): Observable<MailSettings> {
    return this.http.get<MailSettings>(`${this.apiUrl}/admin/mail-settings`);
  }

  updateMailSettings(data: MailSettings): Observable<MailSettings> {
    return this.http.put<MailSettings>(`${this.apiUrl}/admin/mail-settings`, data);
  }
}
