import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '@core/services/api.service';
import { MaterialModule } from '@modules/material.module';

@Component({
  selector: 'app-email-confirm',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './email-confirm.component.html',
  styleUrls: ['./email-confirm.component.scss']
})
export class EmailConfirmComponent implements OnInit {
  message = '';
  loading = true;
  constructor(private route: ActivatedRoute, private api: ApiService, private router: Router) {}

  ngOnInit(): void {
    const token = this.route.snapshot.params['token'];
    this.api.confirmEmailChange(token).subscribe({
      next: () => {
        this.message = 'Deine neue E-Mail-Adresse wurde bestätigt.';
        this.loading = false;
        setTimeout(() => this.router.navigate(['/login']), 5000);
      },
      error: err => {
        this.message = err.error?.message || 'Link ungültig oder abgelaufen.';
        this.loading = false;
        setTimeout(() => this.router.navigate(['/login']), 5000);
      }
    });
  }
}
