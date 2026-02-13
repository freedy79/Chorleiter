import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { NotificationService } from '@core/services/notification.service';

@Component({
  selector: 'app-pwa-service-worker',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './pwa-service-worker.component.html',
  styleUrls: ['./pwa-service-worker.component.scss']
})
export class PwaServiceWorkerComponent implements OnInit {
  form: FormGroup;
  loading = false;
  saving = false;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private notification: NotificationService
  ) {
    this.form = this.fb.group({
      updateCheckInterval: [3600000]
    });
  }

  ngOnInit(): void {
    this.loadConfig();
  }

  loadConfig(): void {
    this.loading = true;
    this.api.getPwaConfigByKey('sw_update_check_interval').subscribe({
      next: (config) => {
        this.form.patchValue({
          updateCheckInterval: Number(config.value) || 3600000
        });
        this.form.markAsPristine();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading SW config:', err);
        this.loading = false;
      }
    });
  }

  save(): void {
    this.saving = true;
    this.api.updatePwaConfig('sw_update_check_interval', {
      value: String(this.form.value.updateCheckInterval)
    }).subscribe({
      next: () => {
        this.saving = false;
        this.notification.success('Service Worker Konfiguration gespeichert');
        this.form.markAsPristine();
      },
      error: (err) => {
        this.saving = false;
        console.error('Error saving SW config:', err);
        this.notification.error('Fehler beim Speichern');
      }
    });
  }

  getIntervalInHours(): number {
    return Math.round(this.form.value.updateCheckInterval / (1000 * 60 * 60));
  }
}
