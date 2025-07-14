import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface AppError {
  message: string;
  status?: number;
  details?: string;
  stack?: string;
  url?: string;
  file?: string;
  line?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ErrorService {
  private errorSubject = new BehaviorSubject<AppError | null>(null);
  public error$ = this.errorSubject.asObservable();
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

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
    return this.http.post(`${this.apiUrl}/client-errors`, {
      message: error.message,
      status: error.status,
      details: error.details,
      stack: error.stack,
      url: error.url,
      file: error.file,
      line: error.line,
    });
  }
}
