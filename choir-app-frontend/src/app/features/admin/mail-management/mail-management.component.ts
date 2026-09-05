import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router } from '@angular/router';
import { ResponsiveService } from '@shared/services/responsive.service';
import { Observable } from 'rxjs';
import { MailTemplatesHubComponent } from './mail-templates-hub.component';
import { MailSettingsHubComponent } from './mail-settings-hub.component';
import { MailLogsHubComponent } from './mail-logs-hub.component';
import { AdminEmailSettingsHubComponent } from './admin-email-settings-hub.component';
import { DemoLeadsHubComponent } from '../demo-leads/demo-leads-hub.component';
import { AdminPageHeaderComponent } from '../shared/admin-page-header/admin-page-header.component';
import { readTabIndex, writeTabIndex } from '../shared/admin-tab-sync';

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
    MatFormFieldModule,
    MatSelectModule,
    AdminPageHeaderComponent,
    MailTemplatesHubComponent,
    MailSettingsHubComponent,
    MailLogsHubComponent,
    AdminEmailSettingsHubComponent,
    DemoLeadsHubComponent
  ]
})
export class MailManagementComponent {
  readonly tabs = [
    { label: 'Templates', icon: 'mail' },
    { label: 'Einstellungen', icon: 'settings' },
    { label: 'Logs', icon: 'history' },
    { label: 'Admin Email', mobileLabel: 'Admin-E-Mail', icon: 'admin_panel_settings' },
    { label: 'Demo', icon: 'touch_app' }
  ];
  private readonly tabKeys = ['templates', 'settings', 'logs', 'admin-email', 'demo-leads'];
  selectedTabIndex = 0;
  isMobile$: Observable<boolean>;

  constructor(
    responsive: ResponsiveService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.isMobile$ = responsive.isHandset$;
    this.selectedTabIndex = readTabIndex(route, this.tabKeys);
  }

  onTabChange(event: MatTabChangeEvent): void {
    this.selectedTabIndex = event.index;
    writeTabIndex(this.router, this.route, this.tabKeys, event.index);
  }

  onSelectedTabIndexChange(index: number): void {
    this.selectedTabIndex = index;
    writeTabIndex(this.router, this.route, this.tabKeys, index);
  }
}
