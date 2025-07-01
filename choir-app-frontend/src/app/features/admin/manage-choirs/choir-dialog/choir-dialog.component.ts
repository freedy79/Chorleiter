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
import { InviteUserDialogComponent } from '../../choir-management/invite-user-dialog/invite-user-dialog.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '@shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-choir-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './choir-dialog.component.html',
  styleUrls: ['./choir-dialog.component.scss']
})
export class ChoirDialogComponent implements OnInit {
  form: FormGroup;
  title = 'Chor hinzufügen';
  displayedColumns: string[] = ['name', 'email', 'role', 'status', 'actions'];
  dataSource = new MatTableDataSource<UserInChoir>();

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<ChoirDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Choir | null,
    private api: ApiService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    this.title = data ? 'Chor bearbeiten' : 'Chor hinzufügen';
    this.form = this.fb.group({
      name: [data?.name || '', Validators.required],
      description: [data?.description || ''],
      location: [data?.location || '']
    });
  }

  ngOnInit(): void {
    if (this.data?.id) {
      this.loadMembers();
    }
  }

  private loadMembers(): void {
    if (!this.data?.id) return;
    this.api.getChoirMembersAdmin(this.data.id).subscribe(m => this.dataSource.data = m);
  }

  openInviteDialog(): void {
    if (!this.data?.id) return;
    const ref = this.dialog.open(InviteUserDialogComponent, { width: '450px' });
    ref.afterClosed().subscribe(result => {
      if (result && result.email && result.role) {
        this.api.inviteUserToChoirAdmin(this.data!.id, result.email, result.role).subscribe({
          next: (resp) => {
            this.snackBar.open(resp.message, 'OK', { duration: 4000 });
            this.loadMembers();
          },
          error: err => this.snackBar.open(err.error?.message || 'Error', 'Close')
        });
      }
    });
  }

  removeMember(user: UserInChoir): void {
    if (!this.data?.id) return;
    const data: ConfirmDialogData = {
      title: 'Remove Member?',
      message: `Are you sure you want to remove ${user.name} (${user.email}) from this choir?`
    };
    const ref = this.dialog.open(ConfirmDialogComponent, { data });
    ref.afterClosed().subscribe(conf => {
      if (conf) {
        this.api.removeUserFromChoirAdmin(this.data!.id, user.id).subscribe({
          next: () => {
            this.snackBar.open('Member removed', 'OK', { duration: 3000 });
            this.loadMembers();
          },
          error: err => this.snackBar.open('Error removing member', 'Close')
        });
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }
}
