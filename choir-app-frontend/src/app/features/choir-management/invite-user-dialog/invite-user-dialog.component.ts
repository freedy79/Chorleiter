import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';

@Component({
  selector: 'app-invite-user-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './invite-user-dialog.component.html',
  styleUrls: ['./invite-user-dialog.component.scss']
})
export class InviteUserDialogComponent {
  inviteForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<InviteUserDialogComponent>
  ) {
    this.inviteForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      role: ['director', Validators.required] // Standardrolle ist 'director'
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onInvite(): void {
    if (this.inviteForm.valid) {
      // Geben Sie das gesamte Formular-Objekt zurück
      this.dialogRef.close(this.inviteForm.value);
    }
  }
}
