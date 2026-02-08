import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MailTemplatesComponent } from '../mail-templates/mail-templates.component';

@Component({
  selector: 'app-mail-templates-hub',
  template: `
    <div class="mail-templates-hub">
      <mat-card>
        <mat-card-header>
          <mat-card-title>E-Mail Templates</mat-card-title>
          <mat-card-subtitle>Verwalte E-Mail-Vorlagen für verschiedene Benachrichtigungen</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <app-mail-templates></app-mail-templates>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .mail-templates-hub {
      mat-card {
        margin-bottom: 16px;
      }
    }
  `],
  standalone: true,
  imports: [CommonModule, MatCardModule, MailTemplatesComponent]
})
export class MailTemplatesHubComponent {}
