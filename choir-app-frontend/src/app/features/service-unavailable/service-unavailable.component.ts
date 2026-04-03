import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';
import { environment } from 'src/environments/environment';
import { BackendStatusService } from '@core/services/backend-status.service';
import { SKIP_GLOBAL_ERROR_REPORTING } from '@core/interceptors/error-interceptor';
import { SKIP_GLOBAL_LOADING } from '@core/interceptors/loading-interceptor';

@Component({
  selector: 'app-service-unavailable',
  standalone: true,
  imports: [CommonModule, MaterialModule, DatePipe],
  templateUrl: './service-unavailable.component.html',
  styleUrls: ['./service-unavailable.component.scss']
})
export class ServiceUnavailableComponent implements OnInit, OnDestroy {
  retryCount = 0;
  isRetrying = false;
  lastRetryTime: Date | null = null;
  secondsUntilRetry = 15;

  private readonly autoRetryInterval = 15;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private http: HttpClient,
    private backendStatusService: BackendStatusService
  ) {}

  ngOnInit(): void {
    this.startAutoRetryCountdown();
  }

  ngOnDestroy(): void {
    this.stopCountdown();
    this.destroy$.next();
    this.destroy$.complete();
  }

  retryPing(): void {
    if (this.isRetrying) return;

    this.isRetrying = true;
    this.stopCountdown();

    const context = new HttpContext()
      .set(SKIP_GLOBAL_ERROR_REPORTING, true)
      .set(SKIP_GLOBAL_LOADING, true);

    this.http.get(`${environment.apiUrl}/ping`, { context }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.backendStatusService.setBackendAvailable(true);
        window.location.reload();
      },
      error: () => {
        this.isRetrying = false;
        this.retryCount++;
        this.lastRetryTime = new Date();
        this.startAutoRetryCountdown();
      }
    });
  }

  hardReload(): void {
    window.location.reload();
  }

  async clearCacheAndReload(): Promise<void> {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
          await caches.delete(cacheName);
        }
      }
    } catch (e) {
      console.error('Cache konnte nicht geleert werden:', e);
    }
    window.location.reload();
  }

  private startAutoRetryCountdown(): void {
    this.secondsUntilRetry = this.autoRetryInterval;
    this.countdownTimer = setInterval(() => {
      this.secondsUntilRetry--;
      if (this.secondsUntilRetry <= 0) {
        this.retryPing();
      }
    }, 1000);
  }

  private stopCountdown(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }
}
