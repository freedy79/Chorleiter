import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { NotificationService } from '@core/services/notification.service';
import { PwaConfig } from '@core/models/pwa-config';

@Component({
  selector: 'app-pwa-vapid-keys',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './pwa-vapid-keys.component.html',
  styleUrls: ['./pwa-vapid-keys.component.scss']
})
export class PwaVapidKeysComponent implements OnInit {
  form: FormGroup;
  loading = false;
  saving = false;
  showPrivateKey = false;
  configs: PwaConfig[] = [];

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private notification: NotificationService
  ) {
    this.form = this.fb.group({
      publicKey: [''],
      privateKey: [''],
      subject: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadConfigs();
  }

  loadConfigs(): void {
    this.loading = true;
    this.api.getPwaConfigsByCategory('vapid').subscribe({
      next: (configs) => {
        this.configs = configs;
        const publicKey = configs.find(c => c.key === 'vapid_public_key');
        const privateKey = configs.find(c => c.key === 'vapid_private_key');
        const subject = configs.find(c => c.key === 'vapid_subject');

        this.form.patchValue({
          publicKey: publicKey?.value || '',
          privateKey: privateKey?.value === '***HIDDEN***' ? '' : (privateKey?.value || ''),
          subject: subject?.value || ''
        });
        this.form.markAsPristine();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading VAPID configs:', err);
        this.notification.error('Fehler beim Laden der VAPID-Konfiguration');
        this.loading = false;
      }
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.notification.error('Bitte füllen Sie alle erforderlichen Felder aus');
      return;
    }

    this.saving = true;
    const updates = [
      { key: 'vapid_public_key', value: this.form.value.publicKey },
      { key: 'vapid_private_key', value: this.form.value.privateKey },
      { key: 'vapid_subject', value: this.form.value.subject }
    ];

    Promise.all(
      updates.map(({ key, value }) =>
        this.api.updatePwaConfig(key, { value }).toPromise()
      )
    ).then(() => {
      this.saving = false;
      this.notification.success('VAPID-Konfiguration gespeichert');
      this.form.markAsPristine();
      this.loadConfigs();
    }).catch(err => {
      this.saving = false;
      console.error('Error saving VAPID configs:', err);
      this.notification.error(err.error?.message || 'Fehler beim Speichern der VAPID-Konfiguration');
    });
  }

  generateKeys(): void {
    this.notification.info(
      'Um VAPID-Keys zu generieren, verwenden Sie: npx web-push generate-vapid-keys',
      5000
    );
  }

  testNotification(): void {
    this.notification.info('Push-Notification-Test wird noch implementiert', 2000);
  }
}
