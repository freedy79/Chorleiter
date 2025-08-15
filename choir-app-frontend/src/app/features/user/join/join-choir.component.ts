import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-join-choir',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './join-choir.component.html',
})
export class JoinChoirComponent implements OnInit {
  form: FormGroup;
  token = '';
  choirName = '';

  constructor(private route: ActivatedRoute, private fb: FormBuilder,
              private api: ApiService, private snack: MatSnackBar,
              private router: Router) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.token = this.route.snapshot.params['token'];
    this.api.getJoinInfo(this.token).subscribe({
      next: d => this.choirName = d.choirName,
      error: () => this.snack.open('Ungültiger Link', 'Schließen')
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    this.api.joinChoir(this.token, this.form.value).subscribe({
      next: () => {
        this.snack.open('Registrierung abgeschlossen. Du kannst dich jetzt anmelden.', 'OK');
        this.router.navigate(['/login']);
      },
      error: err => this.snack.open(err.error?.message || 'Fehler', 'Schließen')
    });
  }
}
