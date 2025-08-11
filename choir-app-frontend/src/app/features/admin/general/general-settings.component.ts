import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { MailSettingsComponent } from '../mail-settings/mail-settings.component';
import { MailTemplatesComponent } from '../mail-templates/mail-templates.component';
import { BackupComponent } from '../backup/backup.component';
import { FrontendUrlSettingsComponent } from '../frontend-url-settings/frontend-url-settings.component';
import { AdminEmailSettingsComponent } from '../admin-email-settings/admin-email-settings.component';
import { PendingChanges } from '@core/guards/pending-changes.guard';

@Component({
  selector: 'app-general-settings',
  standalone: true,
  imports: [CommonModule, MaterialModule, FrontendUrlSettingsComponent, AdminEmailSettingsComponent, MailSettingsComponent, MailTemplatesComponent, BackupComponent],
  templateUrl: './general-settings.component.html',
  styleUrls: ['./general-settings.component.scss']
})
export class GeneralSettingsComponent implements PendingChanges {
  @ViewChild(FrontendUrlSettingsComponent) frontendUrl?: FrontendUrlSettingsComponent;
  @ViewChild(AdminEmailSettingsComponent) adminEmail?: AdminEmailSettingsComponent;
  @ViewChild(MailSettingsComponent) mailSettings?: MailSettingsComponent;
  @ViewChild(MailTemplatesComponent) mailTemplates?: MailTemplatesComponent;

  hasPendingChanges(): boolean {
    return (this.frontendUrl?.hasPendingChanges() ?? false) ||
           (this.adminEmail?.hasPendingChanges() ?? false) ||
           (this.mailSettings?.hasPendingChanges() ?? false) ||
           (this.mailTemplates?.hasPendingChanges() ?? false);
  }
}
