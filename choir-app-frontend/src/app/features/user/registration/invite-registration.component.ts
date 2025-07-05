import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-invite-registration',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './invite-registration.component.html',
  styleUrls: ['./invite-registration.component.scss']
})
export class InviteRegistrationComponent implements OnInit {
  form: FormGroup;
  token: string = '';
  choirName = '';
  email = '';

  constructor(private route: ActivatedRoute, private fb: FormBuilder, private api: ApiService, private snack: MatSnackBar, private router: Router) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      password: ['', Validators.required],
      isOrganist: [false]
    });
  }

  ngOnInit(): void {
    this.token = this.route.snapshot.params['token'];
    this.api.getInvitation(this.token).subscribe({
      next: data => { this.email = data.email; this.choirName = data.choirName; },
      error: () => { this.snack.open('Einladung ungültig oder abgelaufen', 'Schließen'); }
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    const payload = this.form.value;
    this.api.completeRegistration(this.token, payload).subscribe({
      next: () => {
        this.snack.open('Registrierung abgeschlossen. Du kannst dich jetzt anmelden.', 'OK');
        this.router.navigate(['/login']);
      },
      error: err => this.snack.open(err.error?.message || 'Fehler', 'Schließen')
    });
  }
}
