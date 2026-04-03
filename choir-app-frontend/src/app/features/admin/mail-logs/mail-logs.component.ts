import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from 'src/app/core/services/api.service';
import { MatTableDataSource } from '@angular/material/table';
import { MailLog } from 'src/app/core/models/mail-log';
import { MailDeliveryDiagnostics } from 'src/app/core/models/mail-delivery-diagnostics';

@Component({
  selector: 'app-mail-logs',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './mail-logs.component.html',
  styleUrls: ['./mail-logs.component.scss']
})
export class MailLogsComponent implements OnInit {
  logs: MailLog[] = [];
  displayedColumns = ['createdAt', 'status', 'recipients', 'subject', 'errorMessage', 'body'];
  dataSource = new MatTableDataSource<MailLog>();
  showOnlyErrors = true;
  diagnostics: MailDeliveryDiagnostics | null = null;
  diagnosticsLoading = false;
  diagnosticsError: string | null = null;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadLogs();
    this.loadDeliveryDiagnostics();
  }

  loadLogs(): void {
    this.api.getMailLogs(this.showOnlyErrors).subscribe(data => {
      this.logs = data;
      this.dataSource.data = data;
    });
  }

  toggleErrorFilter(value: boolean): void {
    this.showOnlyErrors = value;
    this.loadLogs();
  }

  loadDeliveryDiagnostics(): void {
    this.diagnosticsLoading = true;
    this.diagnosticsError = null;

    this.api.getMailDeliveryDiagnostics().subscribe({
      next: (data) => {
        this.diagnostics = data;
        this.diagnosticsLoading = false;
      },
      error: (err) => {
        this.diagnosticsError = err?.error?.message || 'Mail-Diagnose konnte nicht geladen werden.';
        this.diagnosticsLoading = false;
      }
    });
  }

  clearLogs(): void {
    this.api.clearMailLogs().subscribe(() => {
      this.logs = [];
      this.dataSource.data = [];
    });
  }
}
