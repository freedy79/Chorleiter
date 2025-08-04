import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { StatsSummary } from '@core/models/stats-summary';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgChartsModule } from 'ng2-charts';
import { ChartData } from 'chart.js';

@Component({
  selector: 'app-statistics',
  standalone: true,
  templateUrl: './statistics.component.html',
  styleUrls: ['./statistics.component.scss'],
  imports: [CommonModule, MaterialModule, RouterModule, FormsModule, NgChartsModule]
})
export class StatisticsComponent implements OnInit {
  stats?: StatsSummary;
  startDate?: Date;
  endDate?: Date;
  serviceChartData: ChartData<'bar'> = { labels: [], datasets: [{ data: [], label: 'Gottesdienst-Stücke' }] };
  rehearsalChartData: ChartData<'bar'> = { labels: [], datasets: [{ data: [], label: 'Proben-Stücke' }] };

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const start = this.startDate ? this.startDate.toISOString() : undefined;
    const end = this.endDate ? this.endDate.toISOString() : undefined;
    this.apiService.getStatistics(start, end).subscribe(s => {
      this.stats = s;
      this.serviceChartData = {
        labels: s.topServicePieces.map(p => p.title),
        datasets: [{ data: s.topServicePieces.map(p => p.count), label: 'Gottesdienst-Stücke' }]
      };
      this.rehearsalChartData = {
        labels: s.topRehearsalPieces.map(p => p.title),
        datasets: [{ data: s.topRehearsalPieces.map(p => p.count), label: 'Proben-Stücke' }]
      };
    });
  }
}
