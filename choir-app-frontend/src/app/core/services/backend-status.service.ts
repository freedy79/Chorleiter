import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BackendStatusService {
  private backendAvailableSubject = new BehaviorSubject<boolean>(true);
  public backendAvailable$: Observable<boolean> = this.backendAvailableSubject.asObservable();

  private comingFromUnavailableRedirectSubject = new BehaviorSubject<boolean>(false);
  public comingFromUnavailableRedirect$ = this.comingFromUnavailableRedirectSubject.asObservable();

  setBackendAvailable(available: boolean): void {
    this.backendAvailableSubject.next(available);
  }

  isBackendAvailable(): boolean {
    return this.backendAvailableSubject.value;
  }

  setComingFromUnavailableRedirect(value: boolean): void {
    this.comingFromUnavailableRedirectSubject.next(value);
  }

  isComingFromUnavailableRedirect(): boolean {
    return this.comingFromUnavailableRedirectSubject.value;
  }
}
