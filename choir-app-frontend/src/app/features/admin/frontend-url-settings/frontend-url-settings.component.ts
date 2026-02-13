import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { NotificationService } from '@core/services/notification.service';
import { PendingChanges } from '@core/guards/pending-changes.guard';

@Component({
  selector: 'app-frontend-url-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './frontend-url-settings.component.html',
  styleUrls: ['./frontend-url-settings.component.scss']
})
export class FrontendUrlSettingsComponent implements OnInit, PendingChanges {
  form: FormGroup;
  loading: boolean = false;
  saving: boolean = false;
  error: string | null = null;

  constructor(private fb: FormBuilder, private api: ApiService, private notification: NotificationService) {
    this.form = this.fb.group({
      url: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings(): void {
    this.loading = true;
    this.error = null;
    this.api.getFrontendUrl().subscribe({
      next: (data) => {
        if (data && data.value) {
          this.form.patchValue({ url: data.value });
          this.form.markAsPristine();
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading frontend URL:', err);
        this.error = 'Fehler beim Laden der Frontend-URL';
        this.loading = false;
        this.notification.error(this.error);
      }
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.error = 'Bitte geben Sie eine gültige URL ein';
      return;
    }

    this.saving = true;
    this.error = null;
    this.api.updateFrontendUrl(this.form.value.url).subscribe({
      next: () => {
        this.saving = false;
        this.notification.success('Frontend-URL gespeichert', 2000);
        this.form.markAsPristine();
      },
      error: (err) => {
        this.saving = false;
        console.error('Error saving frontend URL:', err);
        this.error = err.error?.message || 'Fehler beim Speichern der Frontend-URL';
        this.notification.error(this.error);
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
  confirmUnload(event: BeforeUnloadEvent): void {
    if (this.hasPendingChanges()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
