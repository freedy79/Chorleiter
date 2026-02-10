import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from 'src/app/core/services/api.service';
import { MatTableDataSource } from '@angular/material/table';
import { LoginAttempt } from 'src/app/core/models/login-attempt';
import { MatDialog } from '@angular/material/dialog';
import { NotificationService } from '@core/services/notification.service';
import { UserDialogComponent } from '../manage-users/user-dialog/user-dialog.component';
import { MonthNavigationService, MonthYear } from '@shared/services/month-navigation.service';

@Component({
  selector: 'app-login-attempts',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './login-attempts.component.html',
  styleUrls: ['./login-attempts.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginAttemptsComponent implements OnInit {
  attempts: LoginAttempt[] = [];
  displayedColumns = ['email', 'success', 'reason', 'ipAddress', 'userAgent', 'createdAt'];
  dataSource = new MatTableDataSource<LoginAttempt>();
  selected!: MonthYear;

  constructor(private api: ApiService,
              private dialog: MatDialog,
              private notification: NotificationService,
              private monthNav: MonthNavigationService,
              private cdr: ChangeDetectorRef) {
    const now = new Date();
    this.selected = { year: now.getFullYear(), month: now.getMonth() + 1 };
  }

  ngOnInit(): void {
    this.loadAttempts();
  }

  get monthLabel(): string {
    return new Date(this.selected.year, this.selected.month - 1, 1)
      .toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  }

  loadAttempts(): void {
    this.api.getLoginAttempts(this.selected.year, this.selected.month).subscribe(data => {
      this.attempts = data;
      this.dataSource.data = data;
      this.cdr.markForCheck();
    });
  }

  previousMonth(): void {
    this.selected = this.monthNav.previous(this.selected);
    this.loadAttempts();
  }

  nextMonth(): void {
    this.selected = this.monthNav.next(this.selected);
    this.loadAttempts();
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
      error: () => this.notification.error('User not found')
    });
  }
}
