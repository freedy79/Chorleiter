import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MaterialModule } from '@modules/material.module';
import { BaseComponent } from '@shared/components/base.component';
import { FormService } from '@core/services/form.service';
import { NotificationService } from '@core/services/notification.service';
import { AuthService } from '@core/services/auth.service';
import { Form } from '@core/models/form';
import { takeUntil } from 'rxjs/operators';
import { PureDatePipe } from '@shared/pipes/pure-date.pipe';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-form-list',
  standalone: true,
  imports: [CommonModule, RouterModule, MaterialModule, PureDatePipe, DatePipe],
  templateUrl: './form-list.component.html',
  styleUrls: ['./form-list.component.scss'],
})
export class FormListComponent extends BaseComponent implements OnInit {
  forms: Form[] = [];
  loading = true;
  isChoirAdmin = false;

  constructor(
    private formService: FormService,
    private authService: AuthService,
    private notify: NotificationService,
    private router: Router,
  ) {
    super();
  }

  ngOnInit(): void {
    this.authService.isChoirAdmin$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isAdmin => this.isChoirAdmin = isAdmin);

    this.authService.isAdmin$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isAdmin => {
        if (isAdmin) this.isChoirAdmin = true;
      });

    this.loadForms();
  }

  private loadForms(): void {
    this.formService.getForms()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: forms => {
          this.forms = forms;
          this.loading = false;
        },
        error: () => {
          this.notify.error('Formulare konnten nicht geladen werden');
          this.loading = false;
        },
      });
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'draft': return 'Entwurf';
      case 'published': return 'Veröffentlicht';
      case 'closed': return 'Geschlossen';
      default: return status;
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'draft': return 'edit_note';
      case 'published': return 'public';
      case 'closed': return 'lock';
      default: return 'help';
    }
  }

  isFormActive(form: Form): boolean {
    if (form.status !== 'published') return false;
    const now = new Date();
    if (form.openDate && new Date(form.openDate) > now) return false;
    if (form.closeDate && new Date(form.closeDate) < now) return false;
    return true;
  }

  deleteForm(form: Form, event: Event): void {
    event.stopPropagation();
    if (!confirm(`Formular "${form.title}" wirklich löschen? Alle Ergebnisse gehen verloren.`)) return;

    this.formService.deleteForm(form.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.forms = this.forms.filter(f => f.id !== form.id);
          this.notify.success('Formular gelöscht');
        },
        error: () => this.notify.error('Fehler beim Löschen'),
      });
  }

  copyLink(form: Form, event: Event): void {
    event.stopPropagation();
    if (form.publicGuid) {
      const url = `${window.location.origin}/forms/public/${form.publicGuid}`;
      navigator.clipboard.writeText(url).then(() => {
        this.notify.success('Link kopiert');
      });
    }
  }

  navigateToForm(form: Form): void {
    if (this.isChoirAdmin) {
      this.router.navigate(['/forms', form.id, 'edit']);
    } else {
      this.router.navigate(['/forms', form.id, 'fill']);
    }
  }

  navigateToResults(form: Form, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/forms', form.id, 'results']);
  }

  duplicateForm(form: Form, event: Event): void {
    event.stopPropagation();
    this.formService.duplicateForm(form.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (newForm: Form) => {
          this.notify.success('Formular dupliziert');
          this.router.navigate(['/forms', newForm.id, 'edit']);
        },
        error: () => this.notify.error('Fehler beim Duplizieren'),
      });
  }
}
