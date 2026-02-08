import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MailSettingsComponent } from '../mail-settings/mail-settings.component';
import { AdminEmailSettingsComponent } from '../admin-email-settings/admin-email-settings.component';

@Component({
  selector: 'app-mail-settings-hub',
  template: `
    <div class="mail-settings-hub">
      <div class="settings-row">
        <mat-card class="settings-card">
          <mat-card-header>
            <mat-card-title>SMTP Einstellungen</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <app-mail-settings></app-mail-settings>
          </mat-card-content>
        </mat-card>

        <mat-card class="settings-card">
          <mat-card-header>
            <mat-card-title>System-Admin E-Mail</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <app-admin-email-settings></app-admin-email-settings>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .mail-settings-hub {
      .settings-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;

        @media (max-width: 800px) {
          grid-template-columns: 1fr;
        }

        .settings-card {
          height: fit-content;
        }
      }
    }
  `],
  standalone: true,
  imports: [CommonModule, MatCardModule, MailSettingsComponent, AdminEmailSettingsComponent]
})
export class MailSettingsHubComponent {}
