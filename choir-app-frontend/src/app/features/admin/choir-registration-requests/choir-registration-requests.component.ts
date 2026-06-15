import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { MaterialModule } from '@modules/material.module';
import { AdminService } from '@core/services/admin.service';
import { DialogHelperService } from '@core/services/dialog-helper.service';
import { NotificationService } from '@core/services/notification.service';
import { ChoirRegistrationRequest } from '@core/models/choir-registration-admin';

@Component({
  selector: 'app-choir-registration-requests',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule],
  templateUrl: './choir-registration-requests.component.html',
  styleUrls: ['./choir-registration-requests.component.scss']
})
export class ChoirRegistrationRequestsComponent implements OnInit {
  displayedColumns = ['status', 'requester', 'choir', 'location', 'verified', 'createdAt', 'actions'];
  dataSource = new MatTableDataSource<ChoirRegistrationRequest>([]);
  isLoading = false;
  statusFilter: 'all' | 'pending' | 'done' = 'pending';

  constructor(
    private adminService: AdminService,
    private dialogHelper: DialogHelperService,
    private notification: NotificationService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading = true;
    this.adminService.getChoirRegistrationRequests().subscribe({
      next: (requests) => {
        this.dataSource.data = requests;
        this.applyFilter();
        this.isLoading = false;
      },
      error: () => {
        this.notification.error('Registrierungsanfragen konnten nicht geladen werden.');
        this.isLoading = false;
      }
    });
  }

  applyFilter(): void {
    const requests = this.dataSource.data;
    switch (this.statusFilter) {
      case 'pending':
        this.dataSource.filterPredicate = (item) => item.status === 'PENDING_REVIEW';
        this.dataSource.filter = 'pending';
        break;
      case 'done':
        this.dataSource.filterPredicate = (item) => item.status !== 'PENDING_REVIEW';
        this.dataSource.filter = 'done';
        break;
      default:
        this.dataSource.filterPredicate = () => true;
        this.dataSource.filter = `${Date.now()}`;
    }
  }

  approve(request: ChoirRegistrationRequest): void {
    this.dialogHelper.confirm({
      title: 'Anfrage freigeben?',
      message: `Soll der Chor "${request.choirName}" für ${request.requesterName} freigegeben werden?`,
      confirmButtonText: 'Freigeben',
      cancelButtonText: 'Abbrechen'
    }).subscribe(confirmed => {
      if (!confirmed) {
        return;
      }
      this.adminService.approveChoirRegistrationRequest(request.id).subscribe({
        next: () => {
          this.notification.success('Anfrage freigegeben.');
          this.load();
        },
        error: (err) => this.notification.error(err?.error?.message || 'Freigabe fehlgeschlagen.')
      });
    });
  }

  reject(request: ChoirRegistrationRequest): void {
    const reason = window.prompt(`Ablehnungsgrund für "${request.choirName}" (optional):`, request.rejectionReason || '');
    if (reason === null) {
      return;
    }
    this.dialogHelper.confirm({
      title: 'Anfrage ablehnen?',
      message: `Soll die Anfrage von ${request.requesterName} abgelehnt werden?`,
      confirmButtonText: 'Ablehnen',
      cancelButtonText: 'Abbrechen'
    }).subscribe(confirmed => {
      if (!confirmed) {
        return;
      }
      this.adminService.rejectChoirRegistrationRequest(request.id, reason).subscribe({
        next: () => {
          this.notification.success('Anfrage abgelehnt.');
          this.load();
        },
        error: (err) => this.notification.error(err?.error?.message || 'Ablehnung fehlgeschlagen.')
      });
    });
  }

  isPending(request: ChoirRegistrationRequest): boolean {
    return request.status === 'PENDING_REVIEW';
  }

  trackById(_index: number, item: ChoirRegistrationRequest): number {
    return item.id;
  }
}
