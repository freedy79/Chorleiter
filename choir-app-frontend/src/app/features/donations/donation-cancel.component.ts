import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { Router } from '@angular/router';

@Component({
  selector: 'app-donation-cancel',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './donation-cancel.component.html',
})
export class DonationCancelComponent {
  constructor(private router: Router) {}

  back() {
    this.router.navigate(['/']);
  }
}

