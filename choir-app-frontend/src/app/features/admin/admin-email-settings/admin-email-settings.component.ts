import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PendingChanges } from '@core/guards/pending-changes.guard';

@Component({
  selector: 'app-admin-email-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './admin-email-settings.component.html',
  styleUrls: ['./admin-email-settings.component.scss']
})
export class AdminEmailSettingsComponent implements OnInit, PendingChanges {
  form: FormGroup;

  constructor(private fb: FormBuilder, private api: ApiService, private snack: MatSnackBar) {
    this.form = this.fb.group({
      email: ['', Validators.email]
    });
  }

  ngOnInit(): void {
    this.api.getSystemAdminEmail().subscribe(data => {
      if (data && data.value) {
        this.form.patchValue({ email: data.value });
        this.form.markAsPristine();
      }
    });
  }

  save(): void {
    if (this.form.invalid) return;
    this.api.updateSystemAdminEmail(this.form.value.email).subscribe(() => {
      this.snack.open('Gespeichert', 'OK', { duration: 2000 });
      this.form.markAsPristine();
    });
  }

  hasPendingChanges(): boolean {
    return this.form.dirty;
  }

  @HostListener('window:beforeunload', ['$event'])
  confirmUnload(event: BeforeUnloadEvent): void {
    if (this.hasPendingChanges()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
