import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { Donation } from '@core/models/donation';

@Component({
  selector: 'app-donations',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './donations.component.html',
})
export class DonationsComponent implements OnInit {
  donations: Donation[] = [];
  displayedColumns = ['user', 'date', 'amount'];

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.getDonations().subscribe(d => (this.donations = d));
  }
}
