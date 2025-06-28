import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-donation-success',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './donation-success.component.html',
  styleUrls: ['./donation-success.component.scss']
})
export class DonationSuccessComponent implements OnInit {
  constructor(private api: ApiService, private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.api.registerDonation().subscribe(() => {
      this.api.getCurrentUser().subscribe(user => this.auth.setCurrentUser(user));
    });
  }

  back() {
    this.router.navigate(['/']);
  }
}

