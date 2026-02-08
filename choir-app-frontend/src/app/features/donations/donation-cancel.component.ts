import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { Router } from '@angular/router';

@Component({
  selector: 'app-donation-cancel',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './donation-cancel.component.html',
  host: {
    'style': 'display: flex; flex-direction: column; flex: 1; width: 100%; min-height: 100vh;'
  }
})
export class DonationCancelComponent {
  constructor(private router: Router) {}

  back() {
    this.router.navigate(['/']);
  }
}
