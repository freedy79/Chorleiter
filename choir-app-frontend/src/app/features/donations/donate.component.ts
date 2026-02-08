import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { environment } from 'src/environments/environment';
import { PayPalService, DonationSummary } from 'src/app/core/services/paypal.service';
import { AdminService } from '@core/services/admin.service';

@Component({
  selector: 'app-donate',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './donate.component.html',
  host: {
    'style': 'display: flex; flex-direction: column; flex: 1; width: 100%; min-height: 100vh;'
  }
})
export class DonateComponent implements OnInit {
  donationSummary: DonationSummary | null = null;
  donationEmail: string | null = null;
  loadingSummary = false;
  summaryError = false;

  constructor(
    private paypalService: PayPalService,
    private adminService: AdminService
  ) {}

  ngOnInit(): void {
    this.loadDonationSummary();
    this.loadDonationEmail();
  }

  private loadDonationEmail() {
    this.adminService.getPayPalSettings().subscribe({
      next: (settings) => {
        this.donationEmail = settings.donationEmail || null;
        if (!this.donationEmail) {
          console.warn('Donation email not configured in PayPal settings');
        }
      },
      error: (err) => {
        console.error('Error loading PayPal settings:', err);
      }
    });
  }

  private loadDonationSummary() {
    this.loadingSummary = true;
    this.summaryError = false;
    this.paypalService.getDonationSummary().subscribe({
      next: (summary) => {
        this.donationSummary = summary;
        this.loadingSummary = false;
      },
      error: (err) => {
        console.error('Error loading donation summary', err);
        this.summaryError = true;
        this.loadingSummary = false;
      },
    });
  }

  openPaypal() {
    if (!this.donationEmail) {
      console.error('Donation email not configured');
      this.summaryError = true;
      return;
    }

    const base = environment.baseUrl;
    const returnUrl = encodeURIComponent(`${base}/donation-success`);
    const cancelUrl = encodeURIComponent(`${base}/donation-cancel`);

    // NOTE: PayPal simple donation button does not return the amount in the URL.
    // To properly track donations, you would need to:
    // 1. Use PayPal REST API with proper hosted button integration
    // 2. Implement PayPal IPN (Instant Payment Notification) webhook
    // 3. Or manually enter donations in the Admin > Spenden section

    window.location.href = `https://www.paypal.com/donate?business=${encodeURIComponent(this.donationEmail)}&currency_code=EUR&return=${returnUrl}&cancel_return=${cancelUrl}`;
  }
}
