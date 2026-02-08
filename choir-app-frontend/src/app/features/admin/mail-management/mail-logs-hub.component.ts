import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MailLogsComponent } from '../mail-logs/mail-logs.component';

@Component({
  selector: 'app-mail-logs-hub',
  template: `
    <div class="mail-logs-hub">
      <mat-card>
        <mat-card-header>
          <mat-card-title>E-Mail Log</mat-card-title>
          <mat-card-subtitle>Alle versendeten E-Mails und deren Status</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <app-mail-logs></app-mail-logs>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .mail-logs-hub {
      mat-card {
        margin-bottom: 16px;
      }
    }
  `],
  standalone: true,
  imports: [CommonModule, MatCardModule, MailLogsComponent]
})
export class MailLogsHubComponent {}
