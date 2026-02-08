import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { MailTemplatesHubComponent } from './mail-templates-hub.component';
import { MailSettingsHubComponent } from './mail-settings-hub.component';
import { MailLogsHubComponent } from './mail-logs-hub.component';
import { AdminEmailSettingsHubComponent } from './admin-email-settings-hub.component';

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
    MailTemplatesHubComponent,
    MailSettingsHubComponent,
    MailLogsHubComponent,
    AdminEmailSettingsHubComponent
  ]
})
export class MailManagementComponent implements OnInit {
  selectedTabIndex = 0;
  isMobile$: Observable<boolean>;

  constructor(breakpointObserver: BreakpointObserver) {
    this.isMobile$ = breakpointObserver.observe(Breakpoints.Handset).pipe(
      map(result => result.matches)
    );
  }

  ngOnInit(): void {}

  onTabChange(event: MatTabChangeEvent): void {
    this.selectedTabIndex = event.index;
  }
}
