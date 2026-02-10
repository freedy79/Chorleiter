import { Component, OnInit, OnDestroy, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { NotificationService } from '@core/services/notification.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-invite-registration',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './invite-registration.component.html',
  host: {
    'style': 'display: flex; flex-direction: column; flex: 1; width: 100%; min-height: 100vh;'
  }
})
export class InviteRegistrationComponent implements OnInit, OnDestroy {
  private readonly destroyRef = inject(DestroyRef);
  form: FormGroup;
  token: string = '';
  choirName = '';
  email = '';

  constructor(private route: ActivatedRoute, private fb: FormBuilder, private api: ApiService, private notification: NotificationService, private router: Router) {
    this.form = this.fb.group({
      firstName: ['', Validators.required],
      name: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.token = this.route.snapshot.params['token'];
    this.api.getInvitation(this.token).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data: any) => { this.email = data.email; this.choirName = data.choirName; },
      error: () => { this.notification.error('Einladung ungültig oder abgelaufen'); }
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    const payload = this.form.value;
    this.api.completeRegistration(this.token, payload).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.notification.success('Registrierung abgeschlossen. Du kannst dich jetzt anmelden.');
        this.router.navigate(['/login']);
      },
      error: err => this.notification.error(err.error?.message || 'Fehler')
    });
  }

  ngOnDestroy(): void {
    // Cleanup handled by takeUntilDestroyed
  }
}
