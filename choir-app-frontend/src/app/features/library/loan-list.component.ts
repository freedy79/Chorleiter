import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { Loan } from '@core/models/loan';
import { LoanStatusLabelPipe } from '@shared/pipes/loan-status-label.pipe';
import { MatDialog } from '@angular/material/dialog';
import { LoanEditDialogComponent } from './loan-edit-dialog.component';

@Component({
  selector: 'app-loan-list',
  standalone: true,
  imports: [CommonModule, MaterialModule, LoanStatusLabelPipe],
  templateUrl: './loan-list.component.html',
  styleUrls: ['./loan-list.component.scss']
})
export class LoanListComponent implements OnInit {
  loans: Loan[] = [];

  constructor(private api: ApiService, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.api.getLibraryLoans().subscribe(loans => this.loans = loans);
  }

  openEdit(loan: Loan): void {
    const ref = this.dialog.open(LoanEditDialogComponent, { data: { loan } });
    ref.afterClosed().subscribe(result => {
      if (result) {
        this.api.updateLibraryLoan(loan.id, result).subscribe(() => this.load());
      }
    });
  }

  endLoan(loan: Loan): void {
    this.api.endLibraryLoan(loan.id).subscribe(() => this.load());
  }
}
