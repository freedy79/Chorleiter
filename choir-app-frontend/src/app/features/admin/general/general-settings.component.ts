import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { MailSettingsComponent } from '../mail-settings/mail-settings.component';
import { BackupComponent } from '../backup/backup.component';

@Component({
  selector: 'app-general-settings',
  standalone: true,
  imports: [CommonModule, MaterialModule, MailSettingsComponent, BackupComponent],
  templateUrl: './general-settings.component.html',
  styleUrls: ['./general-settings.component.scss']
})
export class GeneralSettingsComponent { }
