import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ServiceWorkerUpdateService } from '../../services/service-worker-update.service';

@Component({
  selector: 'app-pwa-update-notification',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pwa-update-notification"
         *ngIf="updateAvailable"
         @slideDown
         [@slideIn]="'in'">
      <div class="notification-content">
        <div class="notification-message">
          <h4>Update verfügbar</h4>
          <p>Eine neue Version der NAK Chorleiter App ist verfügbar.</p>
        </div>
        <div class="notification-actions">
          <button
            class="btn btn-primary"
            (click)="onUpdateClick()"
            [disabled]="isUpdating"
            aria-label="App aktualisieren">
            <span *ngIf="!isUpdating">Aktualisieren</span>
            <span *ngIf="isUpdating">
              <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Wird aktualisiert...
            </span>
          </button>
          <button
            class="btn btn-secondary"
            (click)="onDismiss()"
            [disabled]="isUpdating"
            aria-label="Benachrichtigung schließen">
            Später
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .pwa-update-notification {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
      color: white;
      z-index: 9999;
      box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.2);
      padding: 1rem;
    }

    .notification-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      max-width: 1200px;
      margin: 0 auto;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .notification-message {
      flex: 1;
      min-width: 200px;
    }

    .notification-message h4 {
      margin: 0 0 0.25rem 0;
      font-size: 1.1rem;
      font-weight: 600;
    }

    .notification-message p {
      margin: 0;
      font-size: 0.95rem;
      opacity: 0.95;
    }

    .notification-actions {
      display: flex;
      gap: 0.75rem;
      white-space: nowrap;
    }

    .btn {
      padding: 0.5rem 1rem;
      font-size: 0.9rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s ease;
    }

    .btn-primary {
      background-color: white;
      color: #1976d2;
    }

    .btn-primary:hover:not(:disabled) {
      background-color: #f5f5f5;
      transform: translateY(-1px);
    }

    .btn-secondary {
      background-color: rgba(255, 255, 255, 0.2);
      color: white;
    }

    .btn-secondary:hover:not(:disabled) {
      background-color: rgba(255, 255, 255, 0.3);
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .spinner-border-sm {
      width: 0.875rem;
      height: 0.875rem;
      border-width: 0.2em;
    }

    @media (max-width: 576px) {
      .notification-content {
        flex-direction: column;
        align-items: stretch;
      }

      .notification-actions {
        flex-direction: column;
      }

      .btn {
        width: 100%;
      }
    }
  `],
  animations: [
    trigger('slideDown', [
      transition(':enter', [
        style({ transform: 'translateY(100%)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateY(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ transform: 'translateY(100%)', opacity: 0 }))
      ])
    ]),
    trigger('slideIn', [
      transition('void => in', [
        style({ transform: 'translateY(100%)' }),
        animate('300ms ease-out')
      ]),
      transition('in => void', [
        animate('300ms ease-in', style({ transform: 'translateY(100%)' }))
      ])
    ])
  ]
})
export class PwaUpdateNotificationComponent implements OnInit, OnDestroy {
  updateAvailable = false;
  isUpdating = false;
  private destroy$ = new Subject<void>();

  constructor(private swUpdateService: ServiceWorkerUpdateService) {}

  ngOnInit(): void {
    this.swUpdateService.updateAvailable
      .pipe(takeUntil(this.destroy$))
      .subscribe(available => {
        this.updateAvailable = available;
      });

    this.swUpdateService.updating
      .pipe(takeUntil(this.destroy$))
      .subscribe(updating => {
        this.isUpdating = updating;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onUpdateClick(): void {
    this.swUpdateService.activateUpdate()
      .catch(err => {
        console.error('Update fehlgeschlagen:', err);
        alert('Die App konnte nicht aktualisiert werden. Bitte versuchen Sie es später erneut.');
      });
  }

  onDismiss(): void {
    this.updateAvailable = false;
  }
}
