import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { StatsSummary } from '@core/models/stats-summary';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-statistics',
  standalone: true,
  templateUrl: './statistics.component.html',
  styleUrls: ['./statistics.component.scss'],
  imports: [CommonModule, FormsModule, MaterialModule, RouterModule]
})
export class StatisticsComponent implements OnInit {
  stats?: StatsSummary;
  startDate?: Date;
  endDate?: Date;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    this.apiService.getStatistics(this.startDate, this.endDate)
      .subscribe(s => this.stats = s);
  }
}
