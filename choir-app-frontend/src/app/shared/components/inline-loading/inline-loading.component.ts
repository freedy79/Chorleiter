import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-inline-loading',
  standalone: true,
  imports: [CommonModule, MatProgressBarModule, MatProgressSpinnerModule],
  templateUrl: './inline-loading.component.html',
  styleUrls: ['./inline-loading.component.scss']
})
export class InlineLoadingComponent {
  @Input() loading = false;
  @Input() mode: 'bar' | 'spinner' = 'bar';
  @Input() diameter = 48;
}
