import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { NotificationService } from '@core/services/notification.service';
import { PwaConfig } from '@core/models/pwa-config';
import { MatDialog } from '@angular/material/dialog';
import { PwaConfigEditDialogComponent } from './pwa-config-edit-dialog.component';

@Component({
  selector: 'app-pwa-all-configs',
  standalone: true,
  imports: [CommonModule, MaterialModule, MatTableModule, MatSortModule, MatPaginatorModule],
  templateUrl: './pwa-all-configs.component.html',
  styleUrls: ['./pwa-all-configs.component.scss']
})
export class PwaAllConfigsComponent implements OnInit {
  displayedColumns = ['key', 'value', 'type', 'category', 'description', 'actions'];
  dataSource = new MatTableDataSource<PwaConfig>([]);
  loading = false;

  @ViewChild(MatSort) set sort(sort: MatSort) {
    if (sort && !this.dataSource.sort) {
      this.dataSource.sort = sort;
    }
  }

  @ViewChild(MatPaginator) set paginator(paginator: MatPaginator) {
    if (paginator && !this.dataSource.paginator) {
      this.dataSource.paginator = paginator;
    }
  }

  constructor(
    private api: ApiService,
    private notification: NotificationService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadConfigs();
  }

  loadConfigs(): void {
    this.loading = true;
    this.api.getAllPwaConfigs().subscribe({
      next: (configs) => {
        this.dataSource.data = configs;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading all PWA configs:', err);
        this.notification.error('Fehler beim Laden der Konfigurationen');
        this.loading = false;
      }
    });
  }

  editConfig(config: PwaConfig): void {
    const dialogRef = this.dialog.open(PwaConfigEditDialogComponent, {
      width: '600px',
      data: config
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadConfigs();
      }
    });
  }

  deleteConfig(config: PwaConfig): void {
    if (!confirm(`Möchten Sie die Konfiguration "${config.key}" wirklich löschen?`)) {
      return;
    }

    this.api.deletePwaConfig(config.key).subscribe({
      next: () => {
        this.notification.success('Konfiguration gelöscht');
        this.loadConfigs();
      },
      error: (err) => {
        console.error('Error deleting config:', err);
        this.notification.error(err.error?.message || 'Fehler beim Löschen der Konfiguration');
      }
    });
  }

  getCategoryColor(category: string): string {
    const colors: { [key: string]: string } = {
      'vapid': '#2196F3',
      'features': '#4CAF50',
      'service_worker': '#FF9800',
      'cache': '#9C27B0',
      'general': '#607D8B'
    };
    return colors[category] || '#999';
  }

  getValueDisplay(config: PwaConfig): string {
    if (!config.value) return '-';
    if (config.isSecret) return '***HIDDEN***';
    if (config.value.length > 50) return config.value.substring(0, 50) + '...';
    return config.value;
  }
}
