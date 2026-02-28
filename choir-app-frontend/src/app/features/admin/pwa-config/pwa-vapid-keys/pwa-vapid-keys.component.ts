import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { NotificationService } from '@core/services/notification.service';
import { PwaConfig } from '@core/models/pwa-config';

interface PushStatus {
  vapidConfigured: boolean;
  envConfigured: boolean;
  totalSubscriptions: number;
  uniqueUsers: number;
  uniqueChoirs: number;
}

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
  generating = false;
  showPrivateKey = false;
  showHelp = false;
  configs: PwaConfig[] = [];
  pushStatus: PushStatus | null = null;

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
    this.loadPushStatus();
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

  loadPushStatus(): void {
    this.api.getPushStatus().subscribe({
      next: (status) => {
        this.pushStatus = status;
      },
      error: () => {
        // silently ignore - status is informational only
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
    const subject = this.form.value.subject || '';
    if (!subject) {
      this.notification.warning('Bitte geben Sie zuerst ein Subject (E-Mail) ein, bevor Sie Schlüssel generieren.');
      return;
    }

    if (this.form.value.publicKey && !confirm(
      'Es sind bereits VAPID-Schlüssel konfiguriert. Wenn Sie neue generieren, werden die bisherigen überschrieben. ' +
      'Alle bestehenden Push-Abonnements der Benutzer werden dadurch ungültig und müssen erneuert werden.\n\n' +
      'Möchten Sie fortfahren?'
    )) {
      return;
    }

    this.generating = true;
    this.api.generateVapidKeys(true, subject).subscribe({
      next: (result) => {
        this.generating = false;
        this.notification.success(result.message || 'VAPID-Schlüssel wurden generiert und gespeichert.');
        this.loadConfigs();
        this.loadPushStatus();
      },
      error: (err) => {
        this.generating = false;
        console.error('Error generating VAPID keys:', err);
        this.notification.error(err.error?.message || 'Fehler beim Generieren der VAPID-Schlüssel');
      }
    });
  }

  testNotification(): void {
    if (typeof Notification === 'undefined') {
      this.notification.warning('Dieser Browser unterstützt keine Push-Benachrichtigungen.');
      return;
    }

    if (Notification.permission === 'denied') {
      this.notification.warning('Push-Benachrichtigungen wurden im Browser blockiert. Bitte erlauben Sie sie in den Browser-Einstellungen.');
      return;
    }

    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        const testNotif = new Notification('Chorleiter – Test-Benachrichtigung', {
          body: 'Push-Benachrichtigungen funktionieren! 🎵',
          icon: '/assets/icons/icon-192x192.png'
        });
        testNotif.onclick = () => testNotif.close();
        this.notification.success('Test-Benachrichtigung wurde gesendet');
      } else {
        this.notification.warning('Berechtigung für Benachrichtigungen wurde nicht erteilt.');
      }
    });
  }

  get hasVapidKeys(): boolean {
    return !!(this.form.value.publicKey);
  }
}
