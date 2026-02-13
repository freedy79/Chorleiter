import { Component, OnInit, Inject, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from '@modules/material.module';
import { AdminService } from '@core/services/admin.service';
import { NotificationService } from '@core/services/notification.service';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-paypal-settings',
  standalone: true,
  imports: [CommonModule, MaterialModule, FormsModule],
  templateUrl: './paypal-settings.component.html',
  styleUrls: ['./paypal-settings.component.scss']
})
export class PayPalSettingsComponent implements OnInit {
  pdtToken: string = '';
  mode: 'sandbox' | 'live' = 'sandbox';
  donationEmail: string = '';
  pdtConfigured: boolean = false;
  saving: boolean = false;
  saved: boolean = false;
  error: string | null = null;
  showToken: boolean = false;
  loading: boolean = false;

  constructor(
    private adminService: AdminService,
    private notification: NotificationService,
    @Optional() public dialogRef: MatDialogRef<PayPalSettingsComponent> | null,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings(): void {
    this.loading = true;
    this.error = null;
    this.adminService.getPayPalSettings().subscribe({
      next: (settings) => {
        this.pdtConfigured = settings.pdtConfigured;
        this.mode = settings.mode || 'sandbox';
        this.donationEmail = settings.donationEmail || '';
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading PayPal settings:', err);
        this.error = 'Fehler beim Laden der PayPal-Einstellungen.';
        this.loading = false;
      }
    });
  }

  saveSettings(): void {
    if (!this.pdtToken) {
      this.error = 'PDT Token ist erforderlich.';
      return;
    }

    if (!this.donationEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.donationEmail)) {
      this.error = 'Gültige Spendenmail-Adresse ist erforderlich.';
      return;
    }

    this.saving = true;
    this.error = null;
    this.saved = false;

    this.adminService.updatePayPalSettings(this.pdtToken, this.mode, this.donationEmail).subscribe({
      next: () => {
        this.saving = false;
        this.saved = true;
        this.pdtConfigured = true;
        this.pdtToken = ''; // Leeren nach dem Speichern

        this.notification.success('PayPal-Einstellungen wurden gespeichert', 3000);
        console.log('PayPal settings saved successfully');

        // Close dialog if opened as dialog
        if (this.dialogRef) {
          setTimeout(() => {
            this.dialogRef?.close({ saved: true });
          }, 1500);
        }
      },
      error: (err) => {
        this.saving = false;
        console.error('Error saving PayPal settings:', err);
        this.error = err.error?.message || 'Fehler beim Speichern der PayPal-Einstellungen.';
        this.notification.error(this.error);
      }
    });
  }

  close(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
    }
  }
}
