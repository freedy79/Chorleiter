import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { ResponsiveService } from '@shared/services/responsive.service';
import { Observable } from 'rxjs';
import { FrontendUrlSettingsComponent } from '../frontend-url-settings/frontend-url-settings.component';
import { PayPalSettingsComponent } from '../paypal-settings/paypal-settings.component';
import { ImprintSettingsComponent } from '../imprint-settings/imprint-settings.component';
import { DevelopComponent } from '../develop/develop.component';

@Component({
  selector: 'app-system-settings',
  templateUrl: './system-settings.component.html',
  styleUrls: ['./system-settings.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatIconModule,
    FrontendUrlSettingsComponent,
    PayPalSettingsComponent,
    ImprintSettingsComponent,
    DevelopComponent
  ]
})
export class SystemSettingsComponent implements OnInit {
  selectedTabIndex = 0;
  isMobile$: Observable<boolean>;

  constructor(responsive: ResponsiveService) {
    this.isMobile$ = responsive.isHandset$;
  }

  ngOnInit(): void {}

  onTabChange(event: any): void {
    this.selectedTabIndex = event.index;
  }
}
