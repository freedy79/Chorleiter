import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router } from '@angular/router';
import { ResponsiveService } from '@shared/services/responsive.service';
import { Observable } from 'rxjs';
import { FrontendUrlSettingsComponent } from '../frontend-url-settings/frontend-url-settings.component';
import { PayPalSettingsComponent } from '../paypal-settings/paypal-settings.component';
import { ImprintSettingsComponent } from '../imprint-settings/imprint-settings.component';
import { PrivacySettingsComponent } from '../privacy-settings/privacy-settings.component';
import { DevelopComponent } from '../develop/develop.component';
import { CkeditorLicenseSettingsComponent } from '../ckeditor-license-settings/ckeditor-license-settings.component';
import { AdminPageHeaderComponent } from '../shared/admin-page-header/admin-page-header.component';
import { readTabIndex, writeTabIndex } from '../shared/admin-tab-sync';

@Component({
  selector: 'app-system-settings',
  templateUrl: './system-settings.component.html',
  styleUrls: ['./system-settings.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
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
  readonly tabs = [
    { label: 'URLs', mobileLabel: 'Frontend-URLs', icon: 'language' },
    { label: 'PayPal', icon: 'payment' },
    { label: 'Imprint', icon: 'description' },
    { label: 'Datenschutz', icon: 'shield' },
    { label: 'Dev', icon: 'code' },
    { label: 'CKEditor', icon: 'vpn_key' }
  ];
  private readonly tabKeys = ['urls', 'paypal', 'imprint', 'privacy', 'develop', 'ckeditor'];
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

  onSelectedTabIndexChange(index: number): void {
    this.selectedTabIndex = index;
    writeTabIndex(this.router, this.route, this.tabKeys, index);
  }
}
