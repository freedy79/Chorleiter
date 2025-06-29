import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from 'src/app/core/services/api.service';
import { MatTableDataSource } from '@angular/material/table';
import { LoginAttempt } from 'src/app/core/models/login-attempt';

@Component({
  selector: 'app-login-attempts',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './login-attempts.component.html',
  styleUrls: ['./login-attempts.component.scss']
})
export class LoginAttemptsComponent implements OnInit {
  attempts: LoginAttempt[] = [];
  displayedColumns = ['email', 'success', 'ipAddress', 'createdAt'];
  dataSource = new MatTableDataSource<LoginAttempt>();

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadAttempts();
  }

  loadAttempts(): void {
    this.api.getLoginAttempts().subscribe(data => {
      this.attempts = data;
      this.dataSource.data = data;
    });
  }
}
