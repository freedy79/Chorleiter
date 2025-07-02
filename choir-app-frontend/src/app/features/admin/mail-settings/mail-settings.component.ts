import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MailSettings } from '@core/models/mail-settings';

@Component({
  selector: 'app-mail-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './mail-settings.component.html',
  styleUrls: ['./mail-settings.component.scss']
})
export class MailSettingsComponent implements OnInit {
  form!: FormGroup;

  constructor(private fb: FormBuilder, private api: ApiService, private snack: MatSnackBar) {
    this.form = this.fb.group({
      host: ['', Validators.required],
      port: [587, Validators.required],
      user: [''],
      pass: [''],
      secure: [false],
      fromAddress: ['']
    });
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.api.getMailSettings().subscribe(settings => {
      if (settings) this.form.patchValue(settings);
    });
  }

  save(): void {
    if (this.form.invalid) return;
    this.api.updateMailSettings(this.form.value as MailSettings).subscribe(() => {
      this.snack.open('Gespeichert', 'OK', { duration: 2000 });
    });
  }
}
