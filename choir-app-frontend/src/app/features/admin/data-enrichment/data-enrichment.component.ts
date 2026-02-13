import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { Observable } from 'rxjs';
import { ResponsiveService } from '@shared/services/responsive.service';
import { AdminPageHeaderComponent } from '../shared/admin-page-header/admin-page-header.component';
import { EnrichmentDashboardComponent } from '@features/admin/data-enrichment/dashboard/enrichment-dashboard.component';
import { EnrichmentSettingsComponent } from '@features/admin/data-enrichment/settings/enrichment-settings.component';
import { EnrichmentSuggestionsComponent } from '@features/admin/data-enrichment/suggestions/enrichment-suggestions.component';
import { EnrichmentJobsComponent } from '@features/admin/data-enrichment/jobs/enrichment-jobs.component';

@Component({
  selector: 'app-data-enrichment',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatIconModule,
    AdminPageHeaderComponent,
    EnrichmentDashboardComponent,
    EnrichmentSettingsComponent,
    EnrichmentSuggestionsComponent,
    EnrichmentJobsComponent
  ],
  templateUrl: './data-enrichment.component.html',
  styleUrls: ['./data-enrichment.component.scss']
})
export class DataEnrichmentComponent {
  selectedTabIndex = 0;
  isMobile$: Observable<boolean>;

  constructor(private responsive: ResponsiveService) {
    this.isMobile$ = this.responsive.isHandset$;
  }

  onTabChange(event: any): void {
    this.selectedTabIndex = event.index;
  }
}
