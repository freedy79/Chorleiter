import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { ResponsiveService } from '@shared/services/responsive.service';
import { Observable } from 'rxjs';
import { ManagePublishersComponent } from '../manage-publishers/manage-publishers.component';
import { ManageCreatorsComponent } from '../manage-creators/manage-creators.component';
import { ManageFilesComponent } from '../manage-files/manage-files.component';
import { AdminPageHeaderComponent } from '../shared/admin-page-header/admin-page-header.component';
import { readTabIndex, writeTabIndex } from '../shared/admin-tab-sync';

@Component({
  selector: 'app-metadata',
  templateUrl: './metadata.component.html',
  styleUrls: ['./metadata.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatIconModule,
    AdminPageHeaderComponent,
    ManagePublishersComponent,
    ManageCreatorsComponent,
    ManageFilesComponent
  ]
})
export class MetadataComponent {
  private readonly tabKeys = ['publishers', 'creators', 'files'];
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
