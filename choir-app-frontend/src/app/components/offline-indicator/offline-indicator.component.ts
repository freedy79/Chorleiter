import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-offline-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="offline-indicator" *ngIf="isOffline" @slideDown>
      <div class="offline-content">
        <span class="offline-icon">⚠️</span>
        <span class="offline-text">Sie sind offline - einige Funktionen stehen nicht zur Verfügung</span>
      </div>
    </div>
  `,
  styles: [`
    .offline-indicator {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background-color: #ff9800;
      color: white;
      padding: 0.75rem;
      text-align: center;
      font-weight: 500;
      z-index: 9998;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }

    .offline-content {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .offline-icon {
      font-size: 1.2rem;
    }

    .offline-text {
      font-size: 0.95rem;
    }

    @media (max-width: 576px) {
      .offline-text {
        font-size: 0.85rem;
      }
    }
  `],
  animations: [
    trigger('slideDown', [
      transition(':enter', [
        style({ transform: 'translateY(-100%)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateY(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ transform: 'translateY(-100%)', opacity: 0 }))
      ])
    ])
  ]
})
export class OfflineIndicatorComponent implements OnInit, OnDestroy {
  isOffline = false;
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    // Überprüfe initialen Online-Status
    this.isOffline = !navigator.onLine;

    // Überwache Online/Offline Events
    window.addEventListener('online', this.onOnline.bind(this));
    window.addEventListener('offline', this.onOffline.bind(this));
  }

  ngOnDestroy(): void {
    window.removeEventListener('online', this.onOnline.bind(this));
    window.removeEventListener('offline', this.onOffline.bind(this));
    this.destroy$.next();
    this.destroy$.complete();
  }

  private onOnline(): void {
    this.isOffline = false;
    console.log('App ist wieder online');
  }

  private onOffline(): void {
    this.isOffline = true;
    console.log('App ist offline');
  }
}
