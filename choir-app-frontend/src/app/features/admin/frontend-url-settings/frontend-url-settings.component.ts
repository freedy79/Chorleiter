import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PendingChanges } from '@core/guards/pending-changes.guard';

@Component({
  selector: 'app-frontend-url-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './frontend-url-settings.component.html',
  styleUrls: ['./frontend-url-settings.component.scss']
})
export class FrontendUrlSettingsComponent implements OnInit, PendingChanges {
  form: FormGroup;

  constructor(private fb: FormBuilder, private api: ApiService, private snack: MatSnackBar) {
    this.form = this.fb.group({
      url: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.api.getFrontendUrl().subscribe(data => {
      if (data && data.value) {
        this.form.patchValue({ url: data.value });
        this.form.markAsPristine();
      }
    });
  }

  save(): void {
    if (this.form.invalid) return;
    this.api.updateFrontendUrl(this.form.value.url).subscribe(() => {
      this.snack.open('Gespeichert', 'OK', { duration: 2000 });
      this.form.markAsPristine();
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
