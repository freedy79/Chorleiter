import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from 'src/app/core/services/api.service';
import { MatTableDataSource } from '@angular/material/table';
import { LoginAttempt } from 'src/app/core/models/login-attempt';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UserDialogComponent } from '../manage-users/user-dialog/user-dialog.component';

@Component({
  selector: 'app-login-attempts',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './login-attempts.component.html',
  styleUrls: ['./login-attempts.component.scss']
})
export class LoginAttemptsComponent implements OnInit {
  attempts: LoginAttempt[] = [];
  displayedColumns = ['email', 'success', 'ipAddress', 'userAgent', 'createdAt'];
  dataSource = new MatTableDataSource<LoginAttempt>();

  constructor(private api: ApiService, private dialog: MatDialog, private snack: MatSnackBar) {}

  ngOnInit(): void {
    this.loadAttempts();
  }

  loadAttempts(): void {
    this.api.getLoginAttempts().subscribe(data => {
      this.attempts = data;
      this.dataSource.data = data;
    });
  }

  openUser(email: string): void {
    this.api.getUserByEmail(email).subscribe({
      next: user => {
        const ref = this.dialog.open(UserDialogComponent, { width: '400px', data: user });
        ref.afterClosed().subscribe(result => {
          if (result) {
            this.api.updateUser(user.id, result).subscribe();
          }
        });
      },
      error: () => this.snack.open('User not found', 'OK', { duration: 3000 })
    });
  }
}
