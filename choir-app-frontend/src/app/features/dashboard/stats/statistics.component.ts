import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { StatsSummary } from '@core/models/stats-summary';

@Component({
  selector: 'app-statistics',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './statistics.component.html',
  styleUrls: ['./statistics.component.scss']
})
export class StatisticsComponent implements OnInit {
  stats?: StatsSummary;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.apiService.getStatistics().subscribe(s => this.stats = s);
  }
}
