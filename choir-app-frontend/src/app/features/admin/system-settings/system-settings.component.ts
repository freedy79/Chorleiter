import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { ResponsiveService } from '@shared/services/responsive.service';
import { Observable } from 'rxjs';
import { FrontendUrlSettingsComponent } from '../frontend-url-settings/frontend-url-settings.component';
import { PayPalSettingsComponent } from '../paypal-settings/paypal-settings.component';
import { ImprintSettingsComponent } from '../imprint-settings/imprint-settings.component';
import { PrivacySettingsComponent } from '../privacy-settings/privacy-settings.component';
import { DevelopComponent } from '../develop/develop.component';
import { CkeditorLicenseSettingsComponent } from '../ckeditor-license-settings/ckeditor-license-settings.component';
import { AdminPageHeaderComponent } from '../shared/admin-page-header/admin-page-header.component';

@Component({
  selector: 'app-system-settings',
  templateUrl: './system-settings.component.html',
  styleUrls: ['./system-settings.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatIconModule,
    AdminPageHeaderComponent,
    FrontendUrlSettingsComponent,
    PayPalSettingsComponent,
    ImprintSettingsComponent,
    PrivacySettingsComponent,
    DevelopComponent,
    CkeditorLicenseSettingsComponent
  ]
})
export class SystemSettingsComponent {
  selectedTabIndex = 0;
  isMobile$: Observable<boolean>;

  constructor(private responsive: ResponsiveService) {
    this.isMobile$ = responsive.isHandset$;
  }

  onTabChange(event: any): void {
    this.selectedTabIndex = event.index;
  }
}
