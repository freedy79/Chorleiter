import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminPageHeaderComponent } from '../shared/admin-page-header/admin-page-header.component';
import { BackupComponent } from '../backup/backup.component';

@Component({
  selector: 'app-backup-hub',
  standalone: true,
  imports: [CommonModule, AdminPageHeaderComponent, BackupComponent],
  templateUrl: './backup-hub.component.html',
})
export class BackupHubComponent {}
