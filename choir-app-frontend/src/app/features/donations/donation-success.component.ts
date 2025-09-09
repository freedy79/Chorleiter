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
})
export class DonationSuccessComponent implements OnInit {
  amount = 0;
  saved = false;

  constructor(private api: ApiService, private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    const params = new URLSearchParams(window.location.search);
    const amt = params.get('amount') || params.get('amt');
    if (amt) {
      const parsed = parseFloat(amt);
      if (!isNaN(parsed)) {
        this.amount = parsed;
        this.save();
      }
    }
  }

  save(): void {
    this.api.registerDonation(this.amount).subscribe(() => {
      this.saved = true;
      this.api.getCurrentUser().subscribe(user => this.auth.setCurrentUser(user));
    });
  }

  back() {
    this.router.navigate(['/']);
  }
}

