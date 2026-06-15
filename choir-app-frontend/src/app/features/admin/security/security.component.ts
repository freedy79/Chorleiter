import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { ResponsiveService } from '@shared/services/responsive.service';
import { Observable } from 'rxjs';
import { LoginAttemptsComponent } from '../login-attempts/login-attempts.component';
import { ProtocolsComponent } from '../protocols/protocols.component';
import { BackupComponent } from '../backup/backup.component';
import { LogViewerComponent } from '../log-viewer/log-viewer.component';
import { AdminPageHeaderComponent } from '../shared/admin-page-header/admin-page-header.component';
import { OtaTokensComponent } from '../ota-tokens/ota-tokens.component';
import { readTabIndex, writeTabIndex } from '../shared/admin-tab-sync';

@Component({
  selector: 'app-security',
  templateUrl: './security.component.html',
  styleUrls: ['./security.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatIconModule,
    AdminPageHeaderComponent,
    LoginAttemptsComponent,
    ProtocolsComponent,
    BackupComponent,
    LogViewerComponent,
    OtaTokensComponent
  ]
})
export class SecurityComponent {
  private readonly tabKeys = ['login', 'protocols', 'backup', 'logs', 'ota'];
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

  onTabChange(event: any): void {
    this.selectedTabIndex = event.index;
    writeTabIndex(this.router, this.route, this.tabKeys, event.index);
  }
}
