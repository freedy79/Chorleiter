import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { Loan } from '@core/models/loan';
import { LoanStatusLabelPipe } from '@shared/pipes/loan-status-label.pipe';

@Component({
  selector: 'app-loan-list',
  standalone: true,
  imports: [CommonModule, MaterialModule, LoanStatusLabelPipe],
  templateUrl: './loan-list.component.html',
  styleUrls: ['./loan-list.component.scss']
})
export class LoanListComponent implements OnInit {
  displayedColumns: string[] = ['collectionTitle', 'choirName', 'startDate', 'endDate', 'status'];
  loans: Loan[] = [];

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.getLibraryLoans().subscribe(loans => this.loans = loans);
  }
}
