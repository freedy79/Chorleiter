import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { ResponsiveService } from '@shared/services/responsive.service';
import { Observable } from 'rxjs';
import { MailTemplatesHubComponent } from './mail-templates-hub.component';
import { MailSettingsHubComponent } from './mail-settings-hub.component';
import { MailLogsHubComponent } from './mail-logs-hub.component';
import { AdminEmailSettingsHubComponent } from './admin-email-settings-hub.component';
import { AdminPageHeaderComponent } from '../shared/admin-page-header/admin-page-header.component';

@Component({
  selector: 'app-mail-management',
  templateUrl: './mail-management.component.html',
  styleUrls: ['./mail-management.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatIconModule,
    MatCardModule,
    AdminPageHeaderComponent,
    MailTemplatesHubComponent,
    MailSettingsHubComponent,
    MailLogsHubComponent,
    AdminEmailSettingsHubComponent
  ]
})
export class MailManagementComponent implements OnInit {
  selectedTabIndex = 0;
  isMobile$: Observable<boolean>;

  constructor(responsive: ResponsiveService) {
    this.isMobile$ = responsive.isHandset$;
  }

  ngOnInit(): void {}

  onTabChange(event: MatTabChangeEvent): void {
    this.selectedTabIndex = event.index;
  }
}
