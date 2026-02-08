import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from '@modules/material.module';
import { MatDialog } from '@angular/material/dialog';
import { ApiService } from '@core/services/api.service';
import { AdminService } from '@core/services/admin.service';
import { Donation } from '@core/models/donation';
import { User } from '@core/models/user';
import { PayPalSettingsComponent } from '../paypal-settings/paypal-settings.component';

@Component({
  selector: 'app-donations',
  standalone: true,
  imports: [CommonModule, MaterialModule, FormsModule],
  templateUrl: './donations.component.html',
})
export class DonationsComponent implements OnInit {
  donations: Donation[] = [];
  users: User[] = [];
  displayedColumns = ['user', 'date', 'amount'];

  // Form fields
  selectedUserId: number | null = null;
  amount: number | null = null;
  donatedAt: string = this.getTodayAsString();
  isAddingDonation = false;

  constructor(
    private api: ApiService,
    private adminService: AdminService,
    private dialog: MatDialog
  ) {}

  private getTodayAsString(): string {
    const today = new Date();
    return today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
  }

  ngOnInit(): void {
    this.loadDonations();
    this.loadUsers();
  }

  loadDonations(): void {
    this.api.getDonations().subscribe(d => (this.donations = d));
  }

  loadUsers(): void {
    this.adminService.getUsers().subscribe(u => (this.users = u));
  }

  addDonation(): void {
    if (!this.selectedUserId || !this.amount) {
      return;
    }

    // Convert date string to Date object
    const donationDate = new Date(this.donatedAt);
    // Add timezone offset to get midnight in local time
    donationDate.setHours(0, 0, 0, 0);

    this.adminService.createDonation(this.selectedUserId, this.amount, donationDate).subscribe({
      next: (donation) => {
        this.donations = [donation, ...this.donations];
        this.resetForm();
        this.isAddingDonation = false;
      },
      error: (err) => {
        console.error('Error creating donation:', err);
        alert('Fehler beim Erstellen der Spende');
      }
    });
  }

  resetForm(): void {
    this.selectedUserId = null;
    this.amount = null;
    this.donatedAt = this.getTodayAsString();
  }

  toggleAddForm(): void {
    this.isAddingDonation = !this.isAddingDonation;
    if (!this.isAddingDonation) {
      this.resetForm();
    }
  }

  openPayPalSettings(): void {
    const dialogRef = this.dialog.open(PayPalSettingsComponent, {
      width: '600px',
      maxHeight: '90vh'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.saved) {
        console.log('PayPal settings updated');
      }
    });
  }
}
