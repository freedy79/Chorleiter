import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';

@Component({
  selector: 'app-donate',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './donate.component.html',
  styleUrls: ['./donate.component.scss']
})
export class DonateComponent {
  openPaypal() {
    const base = window.location.origin;
    const returnUrl = encodeURIComponent(`${base}/donation-success`);
    const cancelUrl = encodeURIComponent(`${base}/donation-cancel`);
    window.location.href = `https://www.paypal.com/donate?business=michael.free%40gmx.de&currency_code=EUR&return=${returnUrl}&cancel_return=${cancelUrl}`;
  }
}

