import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { Subject, combineLatest } from 'rxjs';
import { take, takeUntil } from 'rxjs/operators';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';
import { DialogHelperService } from '@core/services/dialog-helper.service';
import { UserInChoir } from '@core/models/user';
import { ChoirRole } from '@core/models/choir';
import { PersonNamePipe } from '@shared/pipes/person-name.pipe';
import { InviteUserDialogComponent } from '../choir-management/invite-user-dialog/invite-user-dialog.component';

@Component({
  selector: 'app-choir-members',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule, PersonNamePipe],
  templateUrl: './choir-members.component.html',
  styleUrls: ['./choir-members.component.scss']
})
export class ChoirMembersComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  displayedColumns: string[] = ['name', 'voice', 'email'];
  dataSource = new MatTableDataSource<UserInChoir>();

  isChoirAdmin = false;
  isAdmin = false;
  isDirector = false;
  canManageMembers = false;
  canSeeAddresses = false;

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private notification: NotificationService,
    private dialogHelper: DialogHelperService
  ) {}

  ngOnInit(): void {
    combineLatest([
      this.authService.isChoirAdmin$,
      this.authService.isAdmin$,
      this.authService.isDirector$
    ]).pipe(take(1)).subscribe(([isChoirAdmin, isAdmin, isDirector]) => {
      this.isChoirAdmin = isChoirAdmin;
      this.isAdmin = isAdmin;
      this.isDirector = isDirector;
      this.canManageMembers = isChoirAdmin || isAdmin;
      this.canSeeAddresses = isChoirAdmin || isAdmin || isDirector;

      if (this.canManageMembers) {
        this.displayedColumns = ['name', 'voice', 'email', 'street', 'postalCode', 'city', 'role', 'status', 'actions'];
      } else if (this.canSeeAddresses) {
        this.displayedColumns = ['name', 'voice', 'email', 'street', 'postalCode', 'city'];
      }
    });

    this.apiService.getChoirMembers().subscribe(members => {
      this.dataSource.data = members;
    });
  }

  mask(value: string | undefined, share: boolean | undefined): string {
    return share ? (value || '') : '*****';
  }

  copyEmail(email: string): void {
    navigator.clipboard.writeText(email)
      .then(() => this.notification.success('E-Mailadresse kopiert.'))
      .catch(() => this.notification.error('Fehler beim Kopieren.'));
  }

  copyEmailsToClipboard(): void {
    const emails = this.dataSource.data
      .map(u => u.email)
      .filter(email => !!email)
      .join(';');

    if (!emails) {
      this.notification.info('Keine E-Mailadressen vorhanden.');
      return;
    }

    navigator.clipboard.writeText(emails)
      .then(() => this.notification.success('E-Mailadressen kopiert.'))
      .catch(() => this.notification.error('Fehler beim Kopieren der E-Mailadressen.'));
  }

  openInviteDialog(): void {
    if (!this.canManageMembers) return;
    this.dialogHelper.openDialogWithApi(
      InviteUserDialogComponent,
      (result: { email: string; roles: string[] }) => {
        return this.apiService.inviteUserToChoir(result.email, result.roles);
      },
      {
        dialogConfig: { width: '450px' },
        apiConfig: {
          onSuccess: (response: { message: string }) => {
            this.notification.success(response.message, 4000);
            this.reloadData();
          },
          errorMessage: 'Fehler beim Einladen'
        }
      }
    ).subscribe();
  }

  removeMember(user: UserInChoir): void {
    if (!this.canManageMembers) return;
    this.dialogHelper.confirm({
      title: 'Mitglied entfernen?',
      message: `Soll ${user.name}, ${user.firstName} (${user.email}) aus diesem Chor entfernt werden? Dies kann nicht rückgängig gemacht werden.`
    }).subscribe(confirmed => {
      if (confirmed) {
        this.apiService.removeUserFromChoir(user.id).subscribe({
          next: () => {
            this.notification.success(`${user.name}, ${user.firstName} wurde aus dem Chor entfernt.`);
            this.reloadData();
          },
          error: () => this.notification.error('Fehler beim Entfernen des Mitglieds.')
        });
      }
    });
  }

  onRolesChange(user: UserInChoir, roles: ChoirRole[]): void {
    if (!this.canManageMembers) return;
    const previous = [...(user.membership?.rolesInChoir || [])];
    user.membership!.rolesInChoir = roles;
    this.apiService.updateChoirMember(user.id, { rolesInChoir: roles }).subscribe({
      error: () => {
        this.notification.error('Fehler beim Aktualisieren.');
        user.membership!.rolesInChoir = previous;
      }
    });
  }

  private reloadData(): void {
    this.apiService.getChoirMembers().pipe(takeUntil(this.destroy$)).subscribe(members => {
      this.dataSource.data = members;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
