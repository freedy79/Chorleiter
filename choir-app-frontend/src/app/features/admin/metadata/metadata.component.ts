import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { ResponsiveService } from '@shared/services/responsive.service';
import { Observable } from 'rxjs';
import { ManagePublishersComponent } from '../manage-publishers/manage-publishers.component';
import { ManageCreatorsComponent } from '../manage-creators/manage-creators.component';
import { ManageFilesComponent } from '../manage-files/manage-files.component';

@Component({
  selector: 'app-metadata',
  templateUrl: './metadata.component.html',
  styleUrls: ['./metadata.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatIconModule,
    ManagePublishersComponent,
    ManageCreatorsComponent,
    ManageFilesComponent
  ]
})
export class MetadataComponent implements OnInit {
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
