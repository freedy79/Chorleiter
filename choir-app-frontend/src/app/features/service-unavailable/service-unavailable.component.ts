import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { Router } from '@angular/router';
import { BackendStatusService } from '@core/services/backend-status.service';

@Component({
  selector: 'app-service-unavailable',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './service-unavailable.component.html',
  styleUrls: ['./service-unavailable.component.scss']
})
export class ServiceUnavailableComponent implements OnInit, OnDestroy {
  secondsRemaining = 10;
  private redirectTimer: any;

  constructor(
    private router: Router,
    private backendStatusService: BackendStatusService
  ) {}

  ngOnInit(): void {
    this.startRedirectTimer();
  }

  ngOnDestroy(): void {
    if (this.redirectTimer) {
      clearInterval(this.redirectTimer);
    }
  }

  private startRedirectTimer(): void {
    this.redirectTimer = setInterval(() => {
      if (this.secondsRemaining <= 1) {
        clearInterval(this.redirectTimer);
        this.redirectToWelcome();
        return;
      }
      this.secondsRemaining--;
    }, 1000);
  }

  redirectToWelcome(): void {
    this.backendStatusService.setComingFromUnavailableRedirect(true);
    this.router.navigate(['/']);
  }
}
