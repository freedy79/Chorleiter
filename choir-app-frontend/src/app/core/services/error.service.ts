import { Injectable } from '@angular/core';
import { HttpClient, HttpBackend } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface AppError {
  message: string;
  status?: number;
  details?: string;
  url?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ErrorService {
  private errorSubject = new BehaviorSubject<AppError | null>(null);
  public error$ = this.errorSubject.asObservable();
  private apiUrl = environment.apiUrl;
  private httpNoInterceptor: HttpClient;

  constructor(private http: HttpClient, httpBackend: HttpBackend) {
    this.httpNoInterceptor = new HttpClient(httpBackend);
  }

  // Setzt einen neuen Fehler
  setError(error: AppError | null): void {
    this.errorSubject.next(error);
    if (error) {
      this.reportError(error).subscribe({
        error: () => {}
      });
    }
  }

  // Löscht den aktuellen Fehler
  clearError(): void {
    this.errorSubject.next(null);
  }

  private reportError(error: AppError) {
    return this.httpNoInterceptor.post(`${this.apiUrl}/client-errors`, {
      message: error.message,
      status: error.status,
      details: error.details,
      url: error.url ?? window.location.href
    });
  }
}
