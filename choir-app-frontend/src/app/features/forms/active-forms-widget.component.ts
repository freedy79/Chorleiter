import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MaterialModule } from '@modules/material.module';
import { Form } from '@core/models/form';
import { PureDatePipe } from '@shared/pipes/pure-date.pipe';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-active-forms-widget',
  standalone: true,
  imports: [CommonModule, RouterModule, MaterialModule, PureDatePipe, DatePipe],
  template: `
    <mat-card *ngIf="forms && forms.length > 0" class="widget-card">
      <mat-card-header>
        <mat-icon mat-card-avatar class="widget-icon">description</mat-icon>
        <mat-card-title>Offene Formulare</mat-card-title>
        <mat-card-subtitle>{{ forms.length }} aktiv{{ forms.length > 1 ? 'e' : 'es' }} Formular{{ forms.length > 1 ? 'e' : '' }}</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        <mat-nav-list dense>
          <a mat-list-item *ngFor="let form of forms" [routerLink]="['/forms', form.id, 'fill']">
            <mat-icon matListItemIcon>assignment</mat-icon>
            <span matListItemTitle>{{ form.title }}</span>
            <span matListItemLine *ngIf="form.closeDate" class="deadline">
              Bis {{ form.closeDate | pureDate | date:'mediumDate' }}
            </span>
          </a>
        </mat-nav-list>
      </mat-card-content>
      <mat-card-actions align="end">
        <a mat-button routerLink="/forms" color="primary">Alle Formulare</a>
      </mat-card-actions>
    </mat-card>
  `,
  styles: [`
    .widget-card {
      margin-bottom: 16px;
    }
    .widget-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(25, 118, 210, 0.1);
      color: #1976d2;
    }
    .deadline {
      font-size: 0.75rem;
      color: rgba(0, 0, 0, 0.54);
    }
    :host-context(.dark-theme) {
      .widget-icon {
        background: rgba(100, 181, 246, 0.15);
        color: #64b5f6;
      }
      .deadline {
        color: rgba(255, 255, 255, 0.54);
      }
    }
  `],
})
export class ActiveFormsWidgetComponent {
  @Input() forms: Form[] = [];
}
