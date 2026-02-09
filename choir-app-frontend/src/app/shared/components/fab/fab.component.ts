import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { trigger, state, style, transition, animate } from '@angular/animations';

export interface FabAction {
  icon: string;
  label: string;
  action: () => void;
  color?: 'primary' | 'accent' | 'warn';
}

@Component({
  selector: 'app-fab',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  template: `
    <div class="fab-container" [@fabState]="visible ? 'visible' : 'hidden'">
      <!-- Speed Dial Menu -->
      <div class="speed-dial-actions" *ngIf="speedDialOpen && actions.length > 0">
        <button mat-mini-fab
                *ngFor="let action of actions; let i = index"
                [color]="action.color || 'default'"
                (click)="executeAction(action)"
                [style.animation-delay.ms]="i * 50"
                class="speed-dial-item"
                [@speedDialItem]="speedDialOpen ? 'open' : 'closed'">
          <mat-icon>{{ action.icon }}</mat-icon>
        </button>
        <div class="speed-dial-labels">
          <div *ngFor="let action of actions; let i = index"
               class="speed-dial-label"
               [style.animation-delay.ms]="i * 50"
               [@speedDialLabel]="speedDialOpen ? 'open' : 'closed'">
            {{ action.label }}
          </div>
        </div>
      </div>

      <!-- Main FAB -->
      <button mat-fab
              [color]="color"
              (click)="onFabClick()"
              class="main-fab"
              [matTooltip]="tooltip"
              matTooltipPosition="left">
        <mat-icon [@fabIcon]="speedDialOpen ? 'rotated' : 'normal'">
          {{ speedDialOpen ? 'close' : icon }}
        </mat-icon>
      </button>
    </div>
  `,
  styles: [`
    .fab-container {
      position: fixed;
      bottom: 80px; /* Above bottom nav on mobile */
      right: 16px;
      z-index: 999;
      transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    @media (min-width: 600px) {
      .fab-container {
        bottom: 24px;
        right: 24px;
      }
    }

    .main-fab {
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    }

    .speed-dial-actions {
      position: absolute;
      bottom: 72px;
      right: 0;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 12px;
    }

    .speed-dial-item {
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }

    .speed-dial-labels {
      position: absolute;
      right: 56px;
      top: 0;
      display: flex;
      flex-direction: column;
      gap: 12px;
      pointer-events: none;
    }

    .speed-dial-label {
      background: rgba(97, 97, 97, 0.9);
      color: white;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 0.875rem;
      white-space: nowrap;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      height: 40px;
      display: flex;
      align-items: center;
    }
  `],
  animations: [
    trigger('fabState', [
      state('visible', style({ transform: 'scale(1)', opacity: 1 })),
      state('hidden', style({ transform: 'scale(0)', opacity: 0 })),
      transition('visible <=> hidden', animate('200ms cubic-bezier(0.4, 0, 0.2, 1)'))
    ]),
    trigger('fabIcon', [
      state('normal', style({ transform: 'rotate(0deg)' })),
      state('rotated', style({ transform: 'rotate(45deg)' })),
      transition('normal <=> rotated', animate('200ms cubic-bezier(0.4, 0, 0.2, 1)'))
    ]),
    trigger('speedDialItem', [
      state('closed', style({
        transform: 'scale(0) translateY(20px)',
        opacity: 0
      })),
      state('open', style({
        transform: 'scale(1) translateY(0)',
        opacity: 1
      })),
      transition('closed => open', animate('200ms cubic-bezier(0.4, 0, 0.2, 1)')),
      transition('open => closed', animate('150ms cubic-bezier(0.4, 0, 0.2, 1)'))
    ]),
    trigger('speedDialLabel', [
      state('closed', style({
        transform: 'translateX(20px)',
        opacity: 0
      })),
      state('open', style({
        transform: 'translateX(0)',
        opacity: 1
      })),
      transition('closed => open', animate('200ms cubic-bezier(0.4, 0, 0.2, 1)')),
      transition('open => closed', animate('150ms cubic-bezier(0.4, 0, 0.2, 1)'))
    ])
  ]
})
export class FabComponent {
  @Input() icon = 'add';
  @Input() color: 'primary' | 'accent' | 'warn' = 'accent';
  @Input() tooltip = '';
  @Input() actions: FabAction[] = [];
  @Input() hideOnScroll = true;
  @Output() fabClick = new EventEmitter<void>();

  visible = true;
  speedDialOpen = false;
  private lastScrollY = 0;
  private scrollThreshold = 50;

  @HostListener('window:scroll')
  onScroll(): void {
    if (!this.hideOnScroll) return;

    const currentScrollY = window.scrollY;

    // Hide on scroll down, show on scroll up
    if (currentScrollY > this.lastScrollY && currentScrollY > this.scrollThreshold) {
      this.visible = false;
      this.speedDialOpen = false;
    } else if (currentScrollY < this.lastScrollY) {
      this.visible = true;
    }

    this.lastScrollY = currentScrollY;
  }

  onFabClick(): void {
    if (this.actions.length > 0) {
      this.speedDialOpen = !this.speedDialOpen;
    } else {
      this.fabClick.emit();
    }
  }

  executeAction(action: FabAction): void {
    action.action();
    this.speedDialOpen = false;
  }
}
