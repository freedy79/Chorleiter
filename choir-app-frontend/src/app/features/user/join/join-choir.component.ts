import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { NotificationService } from '@core/services/notification.service';

@Component({
  selector: 'app-join-choir',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './join-choir.component.html',
  host: {
    'style': 'display: flex; flex-direction: column; flex: 1; width: 100%; min-height: 100vh;'
  }
})
export class JoinChoirComponent implements OnInit {
  form: FormGroup;
  token = '';
  choirName = '';

  constructor(private route: ActivatedRoute, private fb: FormBuilder,
              private api: ApiService, private notification: NotificationService,
              private router: Router) {
    this.form = this.fb.group({
      firstName: ['', Validators.required],
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.token = this.route.snapshot.params['token'];
    this.api.getJoinInfo(this.token).subscribe({
      next: d => this.choirName = d.choirName,
      error: () => this.notification.error('Ungültiger Link')
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    this.api.joinChoir(this.token, this.form.value).subscribe({
      next: () => {
        this.notification.success('Registrierung abgeschlossen. Du kannst dich jetzt anmelden.');
        this.router.navigate(['/login']);
      },
      error: err => this.notification.error(err.error?.message || 'Fehler')
    });
  }
}
