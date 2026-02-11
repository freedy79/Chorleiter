import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { BaseFormDialog } from '@shared/dialogs/base-form-dialog';

@Component({
  selector: 'app-invite-user-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './invite-user-dialog.component.html',
})
export class InviteUserDialogComponent extends BaseFormDialog implements OnInit {
  constructor(
    fb: FormBuilder,
    dialogRef: MatDialogRef<InviteUserDialogComponent>
  ) {
    super(fb, dialogRef);
  }

  protected buildForm(): FormGroup {
    return this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      roles: [['director'], Validators.required]
    });
  }

  // Preserve original method name for template compatibility
  onInvite(): void {
    this.onSave();
  }
}
