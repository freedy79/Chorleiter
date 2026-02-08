import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-donation-success',
  standalone: true,
  imports: [CommonModule, MaterialModule, FormsModule],
  templateUrl: './donation-success.component.html',
  host: {
    'style': 'display: flex; flex-direction: column; flex: 1; width: 100%; min-height: 100vh;'
  }
})
export class DonationSuccessComponent implements OnInit {
  amount = 0;
  saved = false;
  verifying = false;
  error: string | null = null;
  paypalVerified = false;

  constructor(private api: ApiService, private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    const params = new URLSearchParams(window.location.search);

    // Check for PayPal PDT token first
    const txToken = params.get('tx');
    if (txToken) {
      this.verifyPayPalTransaction(txToken);
      return;
    }

    // Fallback to manual amount parameter
    const amt = params.get('amount') || params.get('amt');
    if (amt) {
      const parsed = parseFloat(amt);
      if (!isNaN(parsed)) {
        this.amount = parsed;
        this.save();
      }
    }
  }

  verifyPayPalTransaction(txToken: string): void {
    this.verifying = true;
    this.api.verifyPayPalTransaction(txToken).subscribe({
      next: (response) => {
        this.verifying = false;
        if (response.verified && response.amount > 0) {
          this.amount = response.amount;
          this.paypalVerified = true;
          this.save();
        } else if (!response.configured) {
          // PDT not configured - show message but don't save
          this.error = 'PayPal PDT ist nicht konfiguriert. Bitte tragen Sie die Spende manuell im Admin-Bereich ein.';
        } else {
          this.error = 'Transaktion konnte nicht verifiziert werden.';
        }
      },
      error: (err) => {
        this.verifying = false;
        console.error('PayPal verification error:', err);
        this.error = 'Fehler bei der PayPal-Verifizierung. Bitte tragen Sie die Spende manuell im Admin-Bereich ein.';
      }
    });
  }

  save(): void {
    if (this.amount <= 0) {
      return;
    }

    this.api.registerDonation(this.amount).subscribe({
      next: () => {
        this.saved = true;
        this.api.getCurrentUser().subscribe(user => this.auth.setCurrentUser(user));
      },
      error: (err) => {
        console.error('Error saving donation:', err);
        this.error = 'Fehler beim Speichern der Spende.';
      }
    });
  }

  back() {
    this.router.navigate(['/']);
  }
}
