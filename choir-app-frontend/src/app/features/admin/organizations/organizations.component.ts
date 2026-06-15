import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { ResponsiveService } from '@shared/services/responsive.service';
import { Observable } from 'rxjs';
import { ManageDistrictsComponent } from '../manage-districts/manage-districts.component';
import { ManageCongregationsComponent } from '../manage-congregations/manage-congregations.component';
import { ManageChoirsComponent } from '../manage-choirs/manage-choirs.component';
import { ChoirRegistrationRequestsComponent } from '../choir-registration-requests/choir-registration-requests.component';
import { AdminPageHeaderComponent } from '../shared/admin-page-header/admin-page-header.component';
import { readTabIndex, writeTabIndex } from '../shared/admin-tab-sync';

@Component({
  selector: 'app-organizations',
  templateUrl: './organizations.component.html',
  styleUrls: ['./organizations.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatIconModule,
    AdminPageHeaderComponent,
    ManageDistrictsComponent,
    ManageCongregationsComponent,
    ManageChoirsComponent,
    ChoirRegistrationRequestsComponent
  ]
})
export class OrganizationsComponent {
  private readonly tabKeys = ['districts', 'congregations', 'choirs', 'registration-requests'];
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
