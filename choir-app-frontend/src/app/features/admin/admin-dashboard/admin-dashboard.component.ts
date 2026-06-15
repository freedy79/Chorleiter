import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { AdminStatusWidgetComponent } from './admin-status-widget.component';
import { AdminNavGroup, AdminNavItem, groupAdminNavByCategory } from '../admin-nav.config';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatCardModule,
    AdminStatusWidgetComponent
  ]
})
export class AdminDashboardComponent {
  readonly groups: AdminNavGroup[] = groupAdminNavByCategory();

  constructor(private router: Router) {}

  navigate(item: AdminNavItem): void {
    this.router.navigate([item.route]);
  }
}
