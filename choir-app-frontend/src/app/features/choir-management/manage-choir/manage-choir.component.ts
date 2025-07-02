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
import { Collection } from 'src/app/core/models/collection';
import { InviteUserDialogComponent } from '../invite-user-dialog/invite-user-dialog.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { ActivatedRoute } from '@angular/router';


@Component({
  selector: 'app-manage-choir',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './manage-choir.component.html',
  styleUrls: ['./manage-choir.component.scss']
})
export class ManageChoirComponent implements OnInit {
  choirForm: FormGroup;

  isChoirAdmin = false;

  displayedCollectionColumns: string[] = ['title', 'publisher', 'actions'];
  collectionDataSource = new MatTableDataSource<Collection>();

  // Für die Mitglieder-Tabelle
  displayedColumns: string[] = ['name', 'email', 'role', 'status', 'actions'];
  dataSource = new MatTableDataSource<UserInChoir>();

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute
  ) {
    this.choirForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      location: ['']
    });
  }

  ngOnInit(): void {
    this.route.data.subscribe(data => {
      const pageData = data['pageData'];
      if (pageData) {
        // Füllen Sie das Formular und die Tabelle
        this.choirForm.patchValue(pageData.choirDetails);
        this.isChoirAdmin = pageData.isChoirAdmin;
        if (!this.isChoirAdmin) {
          this.choirForm.disable();
        }
        this.dataSource.data = pageData.members;
        this.collectionDataSource.data = pageData.collections;
      }
    });
  }

  private reloadData(): void {
    // Sie könnten einen API-Aufruf machen oder, noch besser, zur Seite neu navigieren,
    // um den Resolver erneut auszulösen.
    if (this.isChoirAdmin) {
      this.apiService.getChoirMembers().subscribe(members => {
          this.dataSource.data = members;
      });
      this.apiService.getChoirCollections().subscribe(cols => {
          this.collectionDataSource.data = cols;
      });
    }
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
      error: (err) => this.snackBar.open('Fehler beim Aktualisieren der Chordaten.', 'Schließen')
    });
  }

  openInviteDialog(): void {
    if (!this.isChoirAdmin) {
      return;
    }
    const dialogRef = this.dialog.open(InviteUserDialogComponent, {
      width: '450px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.email && result.role) {
        this.apiService.inviteUserToChoir(result.email, result.role).subscribe({
          next: (response: { message: string }) => {
            this.snackBar.open(response.message, 'OK', { duration: 4000 });
            this.reloadData(); // Aktualisieren Sie die Datenquelle der Tabelle
          },
          error: (err) => this.snackBar.open(`Fehler beim Einladen: ${err.error.message}`, 'Schließen')
        });
      }
    });
  }

  removeMember(user: UserInChoir): void {
    if (!this.isChoirAdmin) {
      return;
    }
    const dialogData: ConfirmDialogData = {
      title: 'Mitglied entfernen?',
      message: `Soll ${user.name} (${user.email}) aus diesem Chor entfernt werden? Dies kann nicht rückgängig gemacht werden.`
    };

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.apiService.removeUserFromChoir(user.id).subscribe({
          next: () => {
            this.snackBar.open(`${user.name} wurde aus dem Chor entfernt.`, 'OK', { duration: 3000 });
            this.reloadData(); // Aktualisieren Sie die Datenquelle der Tabelle
          },
          error: (err) => this.snackBar.open('Fehler beim Entfernen des Mitglieds.', 'Schließen')
        });
      }
    });
  }

  removeCollection(collection: Collection): void {
    if (!this.isChoirAdmin) {
      return;
    }
    const dialogData: ConfirmDialogData = {
      title: 'Sammlung entfernen?',
      message: `Soll die Sammlung '${collection.title}' aus dem Chor entfernt werden?`
    };

    const dialogRef = this.dialog.open(ConfirmDialogComponent, { data: dialogData });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.apiService.removeCollectionFromChoir(collection.id).subscribe({
          next: () => {
            this.snackBar.open(`'${collection.title}' entfernt.`, 'OK', { duration: 3000 });
            this.reloadData();
          },
          error: () => this.snackBar.open('Fehler beim Entfernen der Sammlung.', 'Schließen')
        });
      }
    });
  }
}
