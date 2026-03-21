import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MaterialModule } from '@modules/material.module';
import { AdminService } from '@core/services/admin.service';
import { NotificationService } from '@core/services/notification.service';
import { PendingChanges } from '@core/guards/pending-changes.guard';

@Component({
  selector: 'app-ckeditor-license-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './ckeditor-license-settings.component.html',
  styleUrls: ['./ckeditor-license-settings.component.scss']
})
export class CkeditorLicenseSettingsComponent implements OnInit, PendingChanges {
  form: FormGroup;
  loading = false;
  saving = false;
  error: string | null = null;
  showKey = false;

  constructor(private fb: FormBuilder, private adminService: AdminService, private notification: NotificationService) {
    this.form = this.fb.group({
      licenseKey: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings(): void {
    this.loading = true;
    this.error = null;
    this.adminService.getCkeditorLicenseKey().subscribe({
      next: (data) => {
        if (data?.value) {
          this.form.patchValue({ licenseKey: data.value });
          this.form.markAsPristine();
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading CKEditor license key:', err);
        this.error = 'Fehler beim Laden des CKEditor-Lizenzschlüssels';
        this.loading = false;
      }
    });
  }

  save(): void {
    if (this.form.invalid) return;

    this.saving = true;
    this.error = null;
    this.adminService.updateCkeditorLicenseKey({ value: this.form.value.licenseKey }).subscribe({
      next: () => {
        this.saving = false;
        this.notification.success('CKEditor-Lizenzschlüssel gespeichert', 2000);
        this.form.markAsPristine();
      },
      error: (err) => {
        this.saving = false;
        console.error('Error saving CKEditor license key:', err);
        this.error = err.error?.message || 'Fehler beim Speichern';
        this.notification.error(this.error!);
      }
    });
  }

  hasPendingChanges(): boolean {
    return this.form.dirty;
  }

  getChangedFields(): string[] {
    return Object.keys(this.form.controls).filter(key => this.form.get(key)?.dirty);
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasPendingChanges()) {
      event.preventDefault();
    }
  }
}
