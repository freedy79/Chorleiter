import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { ResponsiveService } from '@shared/services/responsive.service';
import { Observable } from 'rxjs';
import { LoginAttemptsComponent } from '../login-attempts/login-attempts.component';
import { ProtocolsComponent } from '../protocols/protocols.component';
import { BackupComponent } from '../backup/backup.component';
import { LogViewerComponent } from '../log-viewer/log-viewer.component';
import { AdminPageHeaderComponent } from '../shared/admin-page-header/admin-page-header.component';
import { OtaTokensComponent } from '../ota-tokens/ota-tokens.component';

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
  selectedTabIndex = 0;
  isMobile$: Observable<boolean>;

  constructor(responsive: ResponsiveService) {
    this.isMobile$ = responsive.isHandset$;
  }

  onTabChange(event: any): void {
    this.selectedTabIndex = event.index;
  }
}
