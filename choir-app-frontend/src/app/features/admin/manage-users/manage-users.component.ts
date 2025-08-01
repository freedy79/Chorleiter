import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from 'src/app/core/services/api.service';
import { User } from 'src/app/core/models/user';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UserDialogComponent } from './user-dialog/user-dialog.component';
import { UserRoleLabelPipe } from '@shared/pipes/user-role-label.pipe';

@Component({
  selector: 'app-manage-users',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule, UserRoleLabelPipe],
  templateUrl: './manage-users.component.html',
  styleUrls: ['./manage-users.component.scss']
})
export class ManageUsersComponent implements OnInit {
  users: User[] = [];
  displayedColumns = ['name', 'email', 'role', 'choirs', 'lastLogin', 'actions'];
  dataSource = new MatTableDataSource<User>();
  filterValue = '';

  constructor(private api: ApiService, private dialog: MatDialog, private snack: MatSnackBar) {}

  ngOnInit(): void {
    this.dataSource.filterPredicate = (data, filter) => {
      const term = filter.trim().toLowerCase();
      return (
        (data.name && data.name.toLowerCase().includes(term)) ||
        data.email.toLowerCase().includes(term)
      );
    };
    this.loadUsers();
  }

  loadUsers(): void {
    this.api.getUsers().subscribe(data => {
      this.users = data;
      this.dataSource.data = data;
    });
  }

  addUser(): void {
    const ref = this.dialog.open(UserDialogComponent, { width: '400px' });
    ref.afterClosed().subscribe(result => {
      if (result) {
        this.api.createUser(result).subscribe(() => this.loadUsers());
      }
    });
  }

  editUser(user: User): void {
    const ref = this.dialog.open(UserDialogComponent, { width: '400px', data: user });
    ref.afterClosed().subscribe(result => {
      if (result) {
        this.api.updateUser(user.id, result).subscribe(() => this.loadUsers());
      }
    });
  }

  deleteUser(user: User): void {
    if (confirm('Benutzer löschen?')) {
      this.api.deleteUser(user.id).subscribe(() => this.loadUsers());
    }
  }

  sendReset(user: User): void {
    if (confirm('Passwort-Reset-E-Mail senden?')) {
      this.api.sendPasswordReset(user.id).subscribe(() => {
        this.snack.open('E-Mail gesendet, falls der Benutzer existiert.', 'OK', { duration: 3000 });
      });
    }
  }

  choirList(user: any): string {
    if (!user.choirs) return '';
    return user.choirs.map((c: any) => c.name).join(', ');
  }

  applyFilter(value: string): void {
    this.filterValue = value;
    this.dataSource.filter = value.trim().toLowerCase();
  }

  onFilterInput(event: Event): void {
    const value = (event.target as HTMLInputElement | null)?.value ?? '';
    this.applyFilter(value);
  }
}
