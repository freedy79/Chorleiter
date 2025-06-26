import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { AppError, ErrorService } from 'src/app/core/services/error.service';
import { MaterialModule } from '@modules/material.module';

@Component({
  selector: 'app-error-display',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './error-display.component.html',
  styleUrls: ['./error-display.component.scss']
})
export class ErrorDisplayComponent {
  error$: Observable<AppError | null>;

  constructor(private errorService: ErrorService) {
    this.error$ = this.errorService.error$;
  }

  clear(): void {
    this.errorService.clearError();
  }
}
