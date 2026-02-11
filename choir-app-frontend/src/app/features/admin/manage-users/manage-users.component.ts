import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from 'src/app/core/services/api.service';
import { User, GlobalRole } from 'src/app/core/models/user';
import { DialogHelperService } from '@core/services/dialog-helper.service';
import { NotificationService } from '@core/services/notification.service';
import { UserDialogComponent } from './user-dialog/user-dialog.component';
import { AddToChoirDialogComponent } from './add-to-choir-dialog/add-to-choir-dialog.component';
import { ResponsiveService } from '@shared/services/responsive.service';
import { Observable } from 'rxjs';
import { BaseListComponent } from '@shared/components/base-list.component';
import { PaginatorService } from '@core/services/paginator.service';
import { JoinPipe } from '@shared/pipes/join.pipe';

@Component({
  selector: 'app-manage-users',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule, JoinPipe],
  templateUrl: './manage-users.component.html',
  styleUrls: ['./manage-users.component.scss']
})
export class ManageUsersComponent extends BaseListComponent<User> {
  displayedColumns = ['name', 'email', 'roles', 'choirs', 'lastLogin', 'resetToken', 'actions'];
  filterValue = '';
  isHandset$: Observable<boolean>;

  constructor(
    paginatorService: PaginatorService,
    private api: ApiService,
    private dialogHelper: DialogHelperService,
    private notification: NotificationService,
    private responsive: ResponsiveService
  ) {
    super(paginatorService);
    this.isHandset$ = this.responsive.isHandset$;
  }

  get paginatorKey(): string {
    return 'manage-users';
  }

  loadData(): Observable<User[]> {
    return this.api.getUsers();
  }

  protected override customFilterPredicate(data: User, filter: string): boolean {
    const term = filter.trim().toLowerCase();
    return (
      (data.name && data.name.toLowerCase().includes(term)) ||
      (data.firstName && data.firstName.toLowerCase().includes(term)) ||
      data.email.toLowerCase().includes(term)
    );
  }

  addUser(): void {
    this.dialogHelper.openDialogWithApi(
      UserDialogComponent,
      (result) => this.api.createUser(result),
      {
        dialogConfig: { width: '400px' },
        apiConfig: {
          silent: true,
          onSuccess: () => this.refresh()
        }
      }
    ).subscribe();
  }

  editUser(user: User): void {
    this.dialogHelper.openDialogWithApi(
      UserDialogComponent,
      (result) => this.api.updateUser(user.id, result),
      {
        dialogConfig: { width: '400px', data: user },
        apiConfig: {
          silent: true,
          onSuccess: () => this.refresh()
        }
      }
    ).subscribe();
  }

  deleteUser(user: User): void {
    this.dialogHelper.confirmDelete(
      { itemName: 'diesen Benutzer' },
      () => this.api.deleteUser(user.id),
      {
        silent: true,
        onSuccess: () => this.refresh()
      }
    ).subscribe();
  }

  addToChoir(user: User): void {
    this.dialogHelper.openDialogWithApi<
      AddToChoirDialogComponent,
      { choirId: number; roles: string[] },
      { message: string }
    >(
      AddToChoirDialogComponent,
      (result) => this.api.inviteUserToChoirAdmin(result.choirId, user.email, result.roles),
      {
        dialogConfig: { width: '400px' },
        apiConfig: {
          silent: true,
          onSuccess: () => this.refresh()
        }
      }
    ).subscribe();
  }

  sendReset(user: User): void {
    this.dialogHelper.confirm({
      title: 'Passwort-Reset senden?',
      message: 'Passwort-Reset-E-Mail an diesen Benutzer senden?',
      confirmButtonText: 'Senden',
      cancelButtonText: 'Abbrechen'
    }).subscribe(confirmed => {
      if (confirmed) {
        this.api.sendPasswordReset(user.id).subscribe(() => {
          this.notification.success('E-Mail gesendet, falls der Benutzer existiert.');
        });
      }
    });
  }

  clearReset(user: User): void {
    this.dialogHelper.confirm({
      title: 'Reset-Token löschen?',
      message: 'Möchten Sie den Reset-Token wirklich löschen?'
    }).subscribe(confirmed => {
      if (confirmed) {
        this.api.clearResetToken(user.id).subscribe(() => {
          user.resetToken = null;
          user.resetTokenExpiry = null;
          this.notification.success('Reset-Token gelöscht');
        });
      }
    });
  }

  onFilterInput(event: Event): void {
    const value = (event.target as HTMLInputElement | null)?.value ?? '';
    this.filterValue = value;
    this.applyFilter(value);
  }

  onRolesChange(user: User, roles: GlobalRole[]): void {
    const normalized = Array.from(new Set<GlobalRole>(roles ?? []));
    if (!normalized.includes('user')) {
      normalized.push('user');
    }
    this.api.updateUser(user.id, { roles: normalized }).subscribe(() => {
      user.roles = normalized;
      this.notification.success('Rollen aktualisiert');
    });
  }
}
