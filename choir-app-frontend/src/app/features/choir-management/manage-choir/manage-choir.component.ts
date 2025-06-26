import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { Observable } from 'rxjs';

import { MaterialModule } from '@modules/material.module';
import { ApiService } from 'src/app/core/services/api.service';
import { Choir } from 'src/app/core/models/choir';
import { UserInChoir } from 'src/app/core/models/user';

// Importieren Sie die Dialog-Komponenten, die wir gleich erstellen werden
import { InviteUserDialogComponent } from '../invite-user-dialog/invite-user-dialog.component';
import { ConfirmDialogComponent, ConfirmDialogData } from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-manage-choir',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './manage-choir.component.html',
  styleUrls: ['./manage-choir.component.scss']
})
export class ManageChoirComponent implements OnInit {
  choirForm: FormGroup;
  isLoadingDetails = true;
  isLoadingMembers = true;

  // Für die Mitglieder-Tabelle
  displayedColumns: string[] = ['name', 'email', 'role', 'actions'];
  dataSource = new MatTableDataSource<UserInChoir>();

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    this.choirForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      location: ['']
    });
  }

  ngOnInit(): void {
    this.loadChoirDetails();
    this.loadMembers();
  }

  loadChoirDetails(): void {
    this.isLoadingDetails = true;
    this.apiService.getMyChoirDetails().subscribe({
      next: (choir: Choir) => {
        this.choirForm.patchValue(choir);
        this.isLoadingDetails = false;
      },
      error: (err) => {
        this.snackBar.open('Could not load choir details.', 'Close');
        this.isLoadingDetails = false;
      }
    });
  }

  loadMembers(): void {
    this.isLoadingMembers = true;
    this.apiService.getChoirMembers().subscribe({
      next: (members) => {
        this.dataSource.data = members;
        this.isLoadingMembers = false;
      },
      error: (err) => {
        this.snackBar.open('Could not load choir members.', 'Close');
        this.isLoadingMembers = false;
      }
    });
  }

  onSaveChoirDetails(): void {
    if (this.choirForm.invalid) {
      return;
    }
    this.apiService.updateMyChoir(this.choirForm.value).subscribe({
      next: () => {
        this.snackBar.open('Choir details updated successfully!', 'OK', { duration: 3000 });
        this.choirForm.markAsPristine(); // Markiert das Formular als "unverändert"
      },
      error: (err) => this.snackBar.open('Error updating choir details.', 'Close')
    });
  }

  openInviteDialog(): void {
    const dialogRef = this.dialog.open(InviteUserDialogComponent, {
      width: '450px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.email && result.role) {
        this.apiService.inviteUserToChoir(result.email, result.role).subscribe({
          next: (response) => {
            this.snackBar.open(response.message, 'OK', { duration: 4000 });
            this.loadMembers(); // Laden Sie die Mitgliederliste neu
          },
          error: (err) => this.snackBar.open(`Error inviting user: ${err.error.message}`, 'Close')
        });
      }
    });
  }

  removeMember(user: UserInChoir): void {
    const dialogData: ConfirmDialogData = {
      title: 'Remove Member?',
      message: `Are you sure you want to remove ${user.name} (${user.email}) from this choir? This cannot be undone.`
    };

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.apiService.removeUserFromChoir(user.id).subscribe({
          next: () => {
            this.snackBar.open(`${user.name} has been removed from the choir.`, 'OK', { duration: 3000 });
            this.loadMembers(); // Laden Sie die Mitgliederliste neu
          },
          error: (err) => this.snackBar.open('Error removing member.', 'Close')
        });
      }
    });
  }
}
