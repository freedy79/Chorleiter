import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { environment } from 'src/environments/environment';
import { PayPalService, DonationSummary } from 'src/app/core/services/paypal.service';

@Component({
  selector: 'app-donate',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './donate.component.html',
})
export class DonateComponent implements OnInit {
  donationSummary: DonationSummary | null = null;
  loadingSummary = false;
  summaryError = false;

  constructor(private paypalService: PayPalService) {}

  ngOnInit(): void {
    this.loadDonationSummary();
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
    const base = environment.baseUrl;
    const returnUrl = encodeURIComponent(`${base}/donation-success`);
    const cancelUrl = encodeURIComponent(`${base}/donation-cancel`);

    // NOTE: PayPal simple donation button does not return the amount in the URL.
    // To properly track donations, you would need to:
    // 1. Use PayPal REST API with proper hosted button integration
    // 2. Implement PayPal IPN (Instant Payment Notification) webhook
    // 3. Or manually enter donations in the Admin > Spenden section

    window.location.href = `https://www.paypal.com/donate?business=michael.free%40gmx.de&currency_code=EUR&return=${returnUrl}&cancel_return=${cancelUrl}`;
  }
}
