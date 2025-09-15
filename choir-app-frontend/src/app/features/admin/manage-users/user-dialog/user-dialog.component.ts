import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { User } from 'src/app/core/models/user';
import { ApiService } from '@core/services/api.service';
import { District } from '@core/models/district';
import { Congregation } from '@core/models/congregation';

@Component({
  selector: 'app-user-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './user-dialog.component.html',
  styleUrls: ['./user-dialog.component.scss']
})
export class UserDialogComponent implements OnInit {
  form: FormGroup;
  title = 'Benutzer hinzufügen';
  districts: District[] = [];
  congregations: Congregation[] = [];

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    public dialogRef: MatDialogRef<UserDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: User | null
  ) {
    this.title = data ? 'Benutzer bearbeiten' : 'Benutzer hinzufügen';
    this.form = this.fb.group({
      firstName: [data?.firstName || '', Validators.required],
      name: [data?.name || '', Validators.required],
      email: [data?.email || '', [Validators.required, Validators.email]],
      street: [data?.street || ''],
      postalCode: [data?.postalCode || ''],
      city: [data?.city || ''],
      district: [data?.district || ''],
      congregation: [data?.congregation || ''],
      voice: [data?.voice || ''],
      shareWithChoir: [data?.shareWithChoir || false],
      roles: [data?.roles || ['director'], Validators.required],
      password: ['', data ? [] : [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.api.getDistricts().subscribe(ds => this.districts = ds);
    this.api.getCongregations().subscribe(cs => this.congregations = cs);
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
