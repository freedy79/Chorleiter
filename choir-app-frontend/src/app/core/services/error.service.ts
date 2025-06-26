import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface AppError {
  message: string;
  status?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ErrorService {
  private errorSubject = new BehaviorSubject<AppError | null>(null);
  public error$ = this.errorSubject.asObservable();

  // Setzt einen neuen Fehler
  setError(error: AppError | null): void {
    this.errorSubject.next(error);
  }

  // Löscht den aktuellen Fehler
  clearError(): void {
    this.errorSubject.next(null);
  }
}
