import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { AdminEmailSettingsComponent } from '../admin-email-settings/admin-email-settings.component';

@Component({
  selector: 'app-admin-email-settings-hub',
  template: `
    <div class="admin-email-settings-hub">
      <mat-card>
        <mat-card-header>
          <mat-card-title>System-Admin E-Mail</mat-card-title>
          <mat-card-subtitle>Einstellungen für Systemausfall-Benachrichtigungen</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <app-admin-email-settings></app-admin-email-settings>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .admin-email-settings-hub {
      mat-card {
        max-width: 600px;
      }
    }
  `],
  standalone: true,
  imports: [CommonModule, MatCardModule, AdminEmailSettingsComponent]
})
export class AdminEmailSettingsHubComponent {}
