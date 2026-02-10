import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PdfTemplate } from '@core/models/pdf-template';
import { PendingChanges } from '@core/guards/pending-changes.guard';

interface PdfTemplateMeta {
  type: string;
  label: string;
  control: string;
}

@Component({
  selector: 'app-pdf-templates',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './pdf-templates.component.html',
  styleUrls: ['./pdf-templates.component.scss']
})
export class PdfTemplatesComponent implements OnInit, PendingChanges {
  form!: FormGroup;
  templateMeta: PdfTemplateMeta[] = [
    { type: 'program', label: 'Programmheft', control: 'programConfig' },
    { type: 'monthly-plan', label: 'Dienstplan', control: 'monthlyPlanConfig' },
    { type: 'lending-list', label: 'Ausleihliste', control: 'lendingListConfig' },
    { type: 'participation', label: 'Teilnahmeübersicht', control: 'participationConfig' }
  ];

  constructor(private fb: FormBuilder, private api: ApiService, private snack: MatSnackBar) {
    this.form = this.fb.group({
      programConfig: ['', Validators.required],
      monthlyPlanConfig: ['', Validators.required],
      lendingListConfig: ['', Validators.required],
      participationConfig: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.load();
    setTimeout(() => this.form.markAsPristine());
  }

  load(): void {
    this.api.getPdfTemplates().subscribe(templates => {
      const map = new Map(templates.map(t => [t.type, t]));
      this.templateMeta.forEach(meta => {
        const tpl = map.get(meta.type);
        if (tpl) {
          this.form.patchValue({ [meta.control]: tpl.config });
        }
      });
      this.form.markAsPristine();
    });
  }

  save(type?: string): void {
    const metas = type ? this.templateMeta.filter(m => m.type === type) : this.templateMeta;
    for (const meta of metas) {
      const control = this.form.get(meta.control);
      control?.markAsTouched();
      if (!control || control.invalid) return;
      try {
        JSON.parse(control.value);
      } catch (err) {
        this.snack.open(`JSON für ${meta.label} ist ungültig.`, 'OK', { duration: 3000 });
        return;
      }
    }

    const payload: PdfTemplate[] = metas.map(meta => ({
      type: meta.type,
      name: meta.label,
      config: this.form.get(meta.control)?.value
    }));

    this.api.updatePdfTemplates(payload).subscribe(() => {
      this.snack.open('PDF-Templates gespeichert', 'OK', { duration: 2000 });
      metas.forEach(meta => this.form.get(meta.control)?.markAsPristine());
    });
  }

  hasPendingChanges(): boolean {
    return this.form.dirty;
  }

  getChangedFields(): string[] {
    return Object.keys(this.form.controls).filter(key => this.form.get(key)?.dirty);
  }

  @HostListener('window:beforeunload', ['$event'])
  confirmUnload(event: BeforeUnloadEvent): void {
    if (this.hasPendingChanges()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
