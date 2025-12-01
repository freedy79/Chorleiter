import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MaterialModule } from '@modules/material.module';
import { Loan } from '@core/models/loan';

@Component({
  selector: 'app-current-loans-widget',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './current-loans-widget.component.html',
  styleUrls: ['./current-loans-widget.component.scss']
})
export class CurrentLoansWidgetComponent {
  @Input() loans: Loan[] | null = [];
}
