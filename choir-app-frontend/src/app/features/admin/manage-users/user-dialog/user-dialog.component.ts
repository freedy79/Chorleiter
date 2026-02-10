import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { User, GlobalRole } from 'src/app/core/models/user';
import { ApiService } from '@core/services/api.service';
import { District } from '@core/models/district';
import { Congregation } from '@core/models/congregation';
import { BaseFormDialog } from '@shared/dialogs/base-form-dialog';

@Component({
  selector: 'app-user-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './user-dialog.component.html',
  styleUrls: ['./user-dialog.component.scss']
})
export class UserDialogComponent extends BaseFormDialog<User, User | null> implements OnInit {
  title!: string;
  districts: District[] = [];
  congregations: Congregation[] = [];

  constructor(
    fb: FormBuilder,
    dialogRef: MatDialogRef<UserDialogComponent>,
    @Inject(MAT_DIALOG_DATA) data: User | null,
    private api: ApiService
  ) {
    super(fb, dialogRef, data);
    this.title = this.getDialogTitle('Benutzer hinzufügen', 'Benutzer bearbeiten');
  }

  override ngOnInit(): void {
    super.ngOnInit();
    this.api.getDistricts().subscribe(ds => this.districts = ds);
    this.api.getCongregations().subscribe(cs => this.congregations = cs);
  }

  protected buildForm(): FormGroup {
    return this.fb.group({
      firstName: [this.data?.firstName || '', Validators.required],
      name: [this.data?.name || '', Validators.required],
      email: [this.data?.email || '', [Validators.required, Validators.email]],
      phone: [this.data?.phone || ''],
      street: [this.data?.street || ''],
      postalCode: [this.data?.postalCode || ''],
      city: [this.data?.city || ''],
      district: [this.data?.district || ''],
      congregation: [this.data?.congregation || ''],
      voice: [this.data?.voice || ''],
      shareWithChoir: [this.data?.shareWithChoir || false],
      roles: [this.data?.roles || ['user'], Validators.required],
      password: ['', this.data ? [] : [Validators.required]]
    });
  }

  protected override getResult(): User {
    const value = { ...this.form.value };

    // Normalize roles
    if (Array.isArray(value.roles)) {
      const normalized = Array.from(new Set<GlobalRole>(value.roles));
      if (!normalized.includes('user')) {
        normalized.push('user');
      }
      value.roles = normalized;
    }

    // Trim phone
    if (typeof value.phone === 'string') {
      value.phone = value.phone.trim();
    }

    // Remove empty password
    if (!value.password) {
      delete value.password;
    }

    return value;
  }
}
