import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MailSettings } from '@core/models/mail-settings';
import { PendingChanges } from '@core/guards/pending-changes.guard';

@Component({
  selector: 'app-mail-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './mail-settings.component.html',
  styleUrls: ['./mail-settings.component.scss']
})
export class MailSettingsComponent implements OnInit, PendingChanges {
  form!: FormGroup;

  constructor(private fb: FormBuilder, private api: ApiService, private snack: MatSnackBar) {
    this.form = this.fb.group({
      host: ['', Validators.required],
      port: [587, Validators.required],
      user: [''],
      pass: [''],
      secure: [false],
      starttls: [false],
      encryption: ['none'],
      fromAddress: ['']
    });
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.api.getMailSettings().subscribe(settings => {
      if (settings) {
        const encryption = settings.secure
          ? 'tls'
          : settings.starttls
          ? 'starttls'
          : 'none';
        this.form.patchValue({ ...settings, encryption });
        this.form.markAsPristine();
      }
    });
  }

  private prepareData(): MailSettings {
    const { encryption, ...values } = this.form.value;
    return {
      ...(values as MailSettings),
      secure: encryption === 'tls',
      starttls: encryption === 'starttls'
    };
  }

  save(): void {
    if (this.form.invalid) return;
    this.api.updateMailSettings(this.prepareData()).subscribe(() => {
      this.snack.open('Gespeichert', 'OK', { duration: 2000 });
      this.form.markAsPristine();
    });
  }

  sendTest(): void {
    this.api.sendTestMail(this.prepareData()).subscribe(() => {
      this.snack.open('Testmail verschickt', 'OK', { duration: 2000 });
    });
  }

  hasPendingChanges(): boolean {
    return this.form.dirty;
  }

  @HostListener('window:beforeunload', ['$event'])
  confirmUnload(event: BeforeUnloadEvent): void {
    if (this.hasPendingChanges()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
