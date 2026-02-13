import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { NotificationService } from '@core/services/notification.service';

@Component({
  selector: 'app-pwa-cache',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './pwa-cache.component.html',
  styleUrls: ['./pwa-cache.component.scss']
})
export class PwaCacheComponent implements OnInit {
  form: FormGroup;
  loading = false;
  saving = false;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private notification: NotificationService
  ) {
    this.form = this.fb.group({
      maxAgeHours: [24]
    });
  }

  ngOnInit(): void {
    this.loadConfig();
  }

  loadConfig(): void {
    this.loading = true;
    this.api.getPwaConfigByKey('cache_max_age_hours').subscribe({
      next: (config) => {
        this.form.patchValue({
          maxAgeHours: Number(config.value) || 24
        });
        this.form.markAsPristine();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading cache config:', err);
        this.loading = false;
      }
    });
  }

  save(): void {
    this.saving = true;
    this.api.updatePwaConfig('cache_max_age_hours', {
      value: String(this.form.value.maxAgeHours)
    }).subscribe({
      next: () => {
        this.saving = false;
        this.notification.success('Cache-Konfiguration gespeichert');
        this.form.markAsPristine();
      },
      error: (err) => {
        this.saving = false;
        console.error('Error saving cache config:', err);
        this.notification.error('Fehler beim Speichern');
      }
    });
  }
}
