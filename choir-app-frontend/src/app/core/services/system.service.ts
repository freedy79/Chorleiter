import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class SystemService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  pingBackend(): Observable<{ message: string }> {
    return this.http.get<{ message: string }>(`${this.apiUrl}/ping`);
  }
}
