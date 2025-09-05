import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from 'src/app/core/services/api.service';
import { MatTableDataSource } from '@angular/material/table';
import { MailLog } from 'src/app/core/models/mail-log';

@Component({
  selector: 'app-mail-logs',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './mail-logs.component.html',
  styleUrls: ['./mail-logs.component.scss']
})
export class MailLogsComponent implements OnInit {
  logs: MailLog[] = [];
  displayedColumns = ['createdAt', 'recipients', 'subject', 'body'];
  dataSource = new MatTableDataSource<MailLog>();

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadLogs();
  }

  loadLogs(): void {
    this.api.getMailLogs().subscribe(data => {
      this.logs = data;
      this.dataSource.data = data;
    });
  }

  clearLogs(): void {
    this.api.clearMailLogs().subscribe(() => {
      this.logs = [];
      this.dataSource.data = [];
    });
  }
}
