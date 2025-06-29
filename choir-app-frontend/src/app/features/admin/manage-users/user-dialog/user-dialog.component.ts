import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { User } from 'src/app/core/models/user';

@Component({
  selector: 'app-user-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './user-dialog.component.html',
  styleUrls: ['./user-dialog.component.scss']
})
export class UserDialogComponent {
  form: FormGroup;
  title = 'Add User';

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<UserDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: User | null
  ) {
    this.title = data ? 'Edit User' : 'Add User';
    this.form = this.fb.group({
      name: [data?.name || '', Validators.required],
      email: [data?.email || '', [Validators.required, Validators.email]],
      role: [data?.role || 'director', Validators.required],
      password: ['', data ? [] : [Validators.required]]
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.form.valid) {
      const value = { ...this.form.value };
      if (!value.password) {
        delete value.password;
      }
      this.dialogRef.close(value);
    }
  }
}
