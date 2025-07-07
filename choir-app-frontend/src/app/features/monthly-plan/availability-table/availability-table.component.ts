import { Component, Input, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { UserAvailability } from '@core/models/user-availability';

@Component({
  selector: 'app-availability-table',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './availability-table.component.html',
  styleUrls: ['./availability-table.component.scss']
})
export class AvailabilityTableComponent implements OnInit, OnChanges {
  @Input() year!: number;
  @Input() month!: number;
  availabilities: UserAvailability[] = [];
  displayedColumns = ['date', 'status'];

  constructor(private api: ApiService) {}

  ngOnInit(): void { this.load(); }
  ngOnChanges(): void { this.load(); }

  load(): void {
    if (!this.year || !this.month) return;
    this.api.getAvailabilities(this.year, this.month)
      .subscribe(a => this.availabilities = a);
  }

  setStatus(date: string, status: UserAvailability['status']): void {
    const i = this.availabilities.findIndex(v => v.date === date);
    if (i >= 0) this.availabilities[i].status = status;

    this.api.setAvailability(date, status).subscribe(updated => {
      if (i >= 0) this.availabilities[i] = updated;
    });
  }

  cellClass(status: string): string {
    switch (status) {
      case 'AVAILABLE': return 'available';
      case 'MAYBE': return 'maybe';
      case 'UNAVAILABLE': return 'unavailable';
      default: return '';
    }
  }
}
