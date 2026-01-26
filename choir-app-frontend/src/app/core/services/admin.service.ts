import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { Choir, normalizeChoir, normalizeChoirs, normalizeMembers } from '../models/choir';
import { User, UserInChoir } from '../models/user';
import { LoginAttempt } from '../models/login-attempt';
import { StatsSummary } from '../models/stats-summary';
import { MailSettings } from '../models/mail-settings';
import { MailTemplate } from '../models/mail-template';
import { FrontendUrl } from '../models/frontend-url';
import { SystemAdminEmail } from '../models/system-admin-email';
import { UploadOverview } from '../models/backend-file';
import { MailLog } from '../models/mail-log';
import { Donation } from '../models/donation';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getAdminChoirs(): Observable<Choir[]> {
    return this.http.get<Choir[]>(`${this.apiUrl}/admin/choirs`)
      .pipe(map(choirs => normalizeChoirs(choirs)));
  }

  createChoir(data: { name: string; description?: string; location?: string }): Observable<Choir> {
    return this.http.post<Choir>(`${this.apiUrl}/admin/choirs`, data)
      .pipe(map(choir => normalizeChoir(choir) ?? choir));
  }

  updateChoir(id: number, data: { name: string; description?: string; location?: string }): Observable<Choir> {
    return this.http.put<Choir>(`${this.apiUrl}/admin/choirs/${id}`, data)
      .pipe(map(choir => normalizeChoir(choir) ?? choir));
  }

  deleteChoir(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin/choirs/${id}`);
  }

  getChoirMembersAdmin(id: number): Observable<UserInChoir[]> {
    return this.http.get<UserInChoir[]>(`${this.apiUrl}/admin/choirs/${id}/members`)
      .pipe(map(members => normalizeMembers(members)));
  }

  inviteUserToChoirAdmin(id: number, email: string, rolesInChoir: string[]): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/admin/choirs/${id}/members`, { email, rolesInChoir });
  }

  updateChoirMemberAdmin(id: number, userId: number, data: { rolesInChoir?: string[] }): Observable<any> {
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

  clearResetToken(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin/users/${id}/reset-token`);
  }

  getLoginAttempts(year?: number, month?: number): Observable<LoginAttempt[]> {
    const params: any = {};
    if (year !== undefined && month !== undefined) {
      params.year = year;
      params.month = month;
    }
    return this.http.get<LoginAttempt[]>(`${this.apiUrl}/admin/login-attempts`, { params });
  }

  listLogs(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/admin/logs`);
  }

  getLog(filename: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/admin/logs/${encodeURIComponent(filename)}`);
  }

  deleteLog(filename: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin/logs/${encodeURIComponent(filename)}`);
  }

  getMailLogs(): Observable<MailLog[]> {
    return this.http.get<MailLog[]>(`${this.apiUrl}/admin/mail-logs`);
  }

  clearMailLogs(): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin/mail-logs`);
  }

  listUploadFiles(): Observable<UploadOverview> {
    return this.http.get<UploadOverview>(`${this.apiUrl}/admin/uploads`);
  }

  deleteUploadFile(category: string, filename: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin/uploads/${encodeURIComponent(category)}/${encodeURIComponent(filename)}`);
  }

  downloadBackup(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/backup/export`, { responseType: 'blob' });
  }

  restoreBackup(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('backup', file);
    return this.http.post(`${this.apiUrl}/backup/import`, formData);
  }

  getStatistics(startDate?: Date | string, endDate?: Date | string, activeMonths?: number, global?: boolean): Observable<StatsSummary> {
    const params: any = {};
    if (startDate) {
      params.startDate = startDate instanceof Date ? startDate.toISOString() : startDate;
    }
    if (endDate) {
      params.endDate = endDate instanceof Date ? endDate.toISOString() : endDate;
    }
    if (activeMonths !== undefined) {
      params.activeMonths = activeMonths;
    }
    if (global) {
      params.global = true;
    }
    return this.http.get<StatsSummary>(`${this.apiUrl}/stats`, { params });
  }

  getMailSettings(): Observable<MailSettings> {
    return this.http.get<MailSettings>(`${this.apiUrl}/admin/mail-settings`);
  }

  updateMailSettings(data: MailSettings): Observable<MailSettings> {
    return this.http.put<MailSettings>(`${this.apiUrl}/admin/mail-settings`, data);
  }

  sendTestMail(data?: MailSettings): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/admin/mail-settings/test`, data || {});
  }

  sendTemplateTest(type: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/admin/mail-templates/test/${type}`, {});
  }

  getMailTemplates(): Observable<MailTemplate[]> {
    return this.http.get<MailTemplate[]>(`${this.apiUrl}/admin/mail-templates`);
  }

  updateMailTemplates(data: MailTemplate[]): Observable<MailTemplate[]> {
    return this.http.put<MailTemplate[]>(`${this.apiUrl}/admin/mail-templates`, data);
  }

  getFrontendUrl(): Observable<FrontendUrl> {
    return this.http.get<FrontendUrl>(`${this.apiUrl}/admin/frontend-url`);
  }

  updateFrontendUrl(data: FrontendUrl): Observable<FrontendUrl> {
    return this.http.put<FrontendUrl>(`${this.apiUrl}/admin/frontend-url`, data);
  }

  getSystemAdminEmail(): Observable<SystemAdminEmail> {
    return this.http.get<SystemAdminEmail>(`${this.apiUrl}/admin/system-admin-email`);
  }

  updateSystemAdminEmail(data: SystemAdminEmail): Observable<SystemAdminEmail> {
    return this.http.put<SystemAdminEmail>(`${this.apiUrl}/admin/system-admin-email`, data);
  }

  getDonations(): Observable<Donation[]> {
    return this.http.get<Donation[]>(`${this.apiUrl}/admin/donations`);
  }

  createDonation(userId: number, amount: number, donatedAt?: Date): Observable<Donation> {
    return this.http.post<Donation>(`${this.apiUrl}/admin/donations`, { userId, amount, donatedAt });
  }

  getPayPalSettings(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/admin/paypal-settings`);
  }

  updatePayPalSettings(pdtToken: string, mode: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/admin/paypal-settings`, { pdtToken, mode });
  }
}
