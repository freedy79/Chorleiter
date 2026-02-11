import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { ResponsiveService } from '@shared/services/responsive.service';
import { Observable } from 'rxjs';
import { ManageDistrictsComponent } from '../manage-districts/manage-districts.component';
import { ManageCongregationsComponent } from '../manage-congregations/manage-congregations.component';
import { ManageChoirsComponent } from '../manage-choirs/manage-choirs.component';

@Component({
  selector: 'app-organizations',
  templateUrl: './organizations.component.html',
  styleUrls: ['./organizations.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatIconModule,
    ManageDistrictsComponent,
    ManageCongregationsComponent,
    ManageChoirsComponent
  ]
})
export class OrganizationsComponent implements OnInit {
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
