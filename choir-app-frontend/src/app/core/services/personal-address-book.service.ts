import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { EmailAddressCheckResult, PersonalAddressBookEntry } from '../models/personal-address-book-entry';

@Injectable({ providedIn: 'root' })
export class PersonalAddressBookService {
  private apiUrl = `${environment.apiUrl}/personal-address-book`;

  constructor(private http: HttpClient) {}

  list(): Observable<PersonalAddressBookEntry[]> {
    return this.http.get<PersonalAddressBookEntry[]>(this.apiUrl);
  }

  create(entry: Omit<PersonalAddressBookEntry, 'id'>): Observable<PersonalAddressBookEntry> {
    return this.http.post<PersonalAddressBookEntry>(this.apiUrl, entry);
  }

  createBulk(emails: string[]): Observable<PersonalAddressBookEntry[]> {
    return this.http.post<PersonalAddressBookEntry[]>(`${this.apiUrl}/bulk`, { emails });
  }

  update(id: number, entry: Omit<PersonalAddressBookEntry, 'id'>): Observable<PersonalAddressBookEntry> {
    return this.http.put<PersonalAddressBookEntry>(`${this.apiUrl}/${id}`, entry);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  checkEmails(emails: string[]): Observable<EmailAddressCheckResult> {
    return this.http.post<EmailAddressCheckResult>(`${this.apiUrl}/check`, { emails });
  }
}
