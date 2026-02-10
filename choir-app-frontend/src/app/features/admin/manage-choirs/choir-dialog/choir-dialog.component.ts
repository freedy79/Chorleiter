import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { MaterialModule } from '@modules/material.module';
import { Choir } from 'src/app/core/models/choir';
import { UserInChoir } from 'src/app/core/models/user';
import { ApiService } from 'src/app/core/services/api.service';
import { AddMemberDialogComponent } from '../add-member-dialog/add-member-dialog.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { BaseFormDialog } from '@shared/dialogs/base-form-dialog';

@Component({
  selector: 'app-choir-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './choir-dialog.component.html',
  styleUrls: ['./choir-dialog.component.scss']
})
export class ChoirDialogComponent extends BaseFormDialog<Choir, Choir | null> implements OnInit {
  title!: string;
  displayedColumns: string[] = ['name', 'email', 'role', 'organist', 'status', 'actions'];
  dataSource = new MatTableDataSource<UserInChoir>();

  constructor(
    fb: FormBuilder,
    dialogRef: MatDialogRef<ChoirDialogComponent>,
    @Inject(MAT_DIALOG_DATA) data: Choir | null,
    private api: ApiService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    super(fb, dialogRef, data);
    this.title = this.getDialogTitle('Chor hinzufügen', 'Chor bearbeiten');
  }

  override ngOnInit(): void {
    super.ngOnInit();
    if (this.data?.id) {
      this.loadMembers();
    }
  }

  protected buildForm(): FormGroup {
    return this.fb.group({
      name: [this.data?.name || '', Validators.required],
      description: [this.data?.description || ''],
      location: [this.data?.location || '']
    });
  }

  private loadMembers(): void {
    if (!this.data?.id) return;
    this.api.getChoirMembersAdmin(this.data.id).subscribe(m => this.dataSource.data = m);
  }

  openInviteDialog(): void {
    if (!this.data?.id) return;
    const memberIds = this.dataSource.data.map(m => m.id);
    const ref = this.dialog.open(AddMemberDialogComponent, { width: '450px', data: memberIds });
    ref.afterClosed().subscribe(result => {
      if (result && result.email && result.roles) {
        this.api.inviteUserToChoirAdmin(this.data!.id, result.email, result.roles).subscribe({
          next: (resp) => {
            this.snackBar.open(resp.message, 'OK', { duration: 4000 });
            this.loadMembers();
          },
          error: err => this.snackBar.open(err.error?.message || 'Fehler', 'Schließen')
        });
      }
    });
  }

  removeMember(user: UserInChoir): void {
    if (!this.data?.id) return;
    const data: ConfirmDialogData = {
      title: 'Mitglied entfernen?',
      message: `Soll ${user.name}, ${user.firstName} (${user.email}) aus diesem Chor entfernt werden?`
    };
    const ref = this.dialog.open(ConfirmDialogComponent, { data });
    ref.afterClosed().subscribe(conf => {
      if (conf) {
        this.api.removeUserFromChoirAdmin(this.data!.id, user.id).subscribe({
          next: () => {
            this.snackBar.open('Mitglied entfernt', 'OK', { duration: 3000 });
            this.loadMembers();
          },
          error: () => this.snackBar.open('Fehler beim Entfernen des Mitglieds', 'Schließen')
        });
      }
    });
  }

  toggleOrganist(user: UserInChoir, checked: boolean): void {
    if (!this.data?.id) return;
    const roles = user.membership?.rolesInChoir || [];
    const updated = (checked ? [...new Set([...roles, 'organist'])] : roles.filter(r => r !== 'organist')) as ('director' | 'choir_admin' | 'organist' | 'singer')[];
    this.api.updateChoirMemberAdmin(this.data.id, user.id, { rolesInChoir: updated }).subscribe({
      next: () => user.membership!.rolesInChoir = updated,
      error: () => this.snackBar.open('Fehler beim Aktualisieren', 'Schließen')
    });
  }
}
