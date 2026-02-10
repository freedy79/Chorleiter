import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from '@modules/material.module';
import { AdminService } from '@core/services/admin.service';
import { NotificationService } from '@core/services/notification.service';
import { ImprintSettings } from '@core/models/imprint-settings';

@Component({
  selector: 'app-imprint-settings',
  standalone: true,
  imports: [CommonModule, MaterialModule, FormsModule],
  templateUrl: './imprint-settings.component.html',
  styleUrls: ['./imprint-settings.component.scss']
})
export class ImprintSettingsComponent implements OnInit {
  name: string = '';
  street: string = '';
  postalCode: string = '';
  city: string = '';
  country: string = '';
  phone: string = '';
  email: string = '';
  responsibleName: string = '';
  isComplete: boolean = false;
  loading: boolean = true;
  saving: boolean = false;
  saved: boolean = false;
  error: string | null = null;

  constructor(
    private adminService: AdminService,
    private notification: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings(): void {
    this.loading = true;
    this.error = null;

    this.adminService.getImprintSettings().subscribe({
      next: (settings: ImprintSettings) => {
        this.name = settings.name || '';
        this.street = settings.street || '';
        this.postalCode = settings.postalCode || '';
        this.city = settings.city || '';
        this.country = settings.country || '';
        this.phone = settings.phone || '';
        this.email = settings.email || '';
        this.responsibleName = settings.responsibleName || '';
        this.isComplete = settings.isComplete;
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error loading imprint settings:', err);
        this.error = 'Fehler beim Laden der Impressum-Einstellungen.';
        this.loading = false;
      }
    });
  }

  saveSettings(): void {
    // Validierung
    if (!this.name || !this.street || !this.postalCode || !this.city || !this.email) {
      this.error = 'Bitte füllen Sie alle Pflichtfelder aus.';
      return;
    }

    if (this.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
      this.error = 'Ungültige E-Mail-Adresse.';
      return;
    }

    this.saving = true;
    this.error = null;
    this.saved = false;

    const data: ImprintSettings = {
      name: this.name,
      street: this.street,
      postalCode: this.postalCode,
      city: this.city,
      country: this.country,
      phone: this.phone,
      email: this.email,
      responsibleName: this.responsibleName,
      isComplete: true
    };

    this.adminService.updateImprintSettings(data).subscribe({
      next: () => {
        this.saving = false;
        this.saved = true;
        this.isComplete = true;
        this.notification.success('Impressum gespeichert', 2000);
        console.log('Imprint settings saved successfully');

        // Erfolgsmeldung nach kurzer Zeit zurücksetzen
        setTimeout(() => {
          this.saved = false;
        }, 3000);
      },
      error: (err: any) => {
        this.saving = false;
        console.error('Error saving imprint settings:', err);
        this.error = err.error?.message || 'Fehler beim Speichern der Impressum-Einstellungen.';
        this.notification.error('Fehler beim Speichern');
      }
    });
  }

  get isValid(): boolean {
    return !!(this.name && this.street && this.postalCode && this.city && this.email);
  }
}
