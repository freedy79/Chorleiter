import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MaterialModule } from '@modules/material.module';
import { BaseComponent } from '@shared/components/base.component';
import { FormService } from '@core/services/form.service';
import { NotificationService } from '@core/services/notification.service';
import { Form, FormField, FormFieldShowIf } from '@core/models/form';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-form-fill',
  standalone: true,
  imports: [CommonModule, RouterModule, MaterialModule, ReactiveFormsModule, FormsModule],
  templateUrl: './form-fill.component.html',
  styleUrls: ['./form-fill.component.scss'],
})
export class FormFillComponent extends BaseComponent implements OnInit {
  formData: Form | Partial<Form> | null = null;
  fillForm!: FormGroup;
  loading = true;
  submitting = false;
  submitted = false;
  confirmationText = 'Danke für deine Teilnahme!';
  isPublic = false;
  isPreview = false;
  publicGuid: string | null = null;
  formId: number | null = null;

  // Rating helper
  ratingValues = [1, 2, 3, 4, 5];

  // Conditional visibility tracking
  private fieldVisibility: Record<string, boolean> = {};

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private formService: FormService,
    private notify: NotificationService,
  ) {
    super();
  }

  ngOnInit(): void {
    this.fillForm = this.fb.group({});

    // Check preview mode from route data
    this.isPreview = !!this.route.snapshot.data['isPreview'];

    // Check if public route
    this.publicGuid = this.route.snapshot.paramMap.get('guid');
    if (this.publicGuid) {
      this.isPublic = true;
      this.loadPublicForm();
    } else {
      this.formId = parseInt(this.route.snapshot.paramMap.get('id')!, 10);
      this.loadForm();
    }
  }

  private loadForm(): void {
    this.formService.getFormById(this.formId!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: form => {
          this.formData = form;
          this.confirmationText = form.confirmationText || this.confirmationText;
          this.buildFormControls(form.fields || []);
          this.loading = false;
        },
        error: () => {
          this.notify.error('Formular nicht verfügbar');
          this.loading = false;
        },
      });
  }

  private loadPublicForm(): void {
    this.formService.getPublicForm(this.publicGuid!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: form => {
          this.formData = form;
          this.buildFormControls((form.fields as FormField[]) || []);
          this.loading = false;
        },
        error: (err) => {
          const msg = err?.error?.message || 'Formular nicht verfügbar';
          this.notify.error(msg);
          this.loading = false;
        },
      });
  }

  private buildFormControls(fields: FormField[]): void {
    fields.forEach(field => {
      if (field.type === 'heading' || field.type === 'separator') return;

      const validators = [];
      if (field.required) {
        validators.push(Validators.required);
      }
      if (field.type === 'email') {
        validators.push(Validators.email);
      }
      if (field.validationRules) {
        if (field.validationRules.minLength) {
          validators.push(Validators.minLength(field.validationRules.minLength));
        }
        if (field.validationRules.maxLength) {
          validators.push(Validators.maxLength(field.validationRules.maxLength));
        }
        if (field.validationRules.min != null) {
          validators.push(Validators.min(field.validationRules.min));
        }
        if (field.validationRules.max != null) {
          validators.push(Validators.max(field.validationRules.max));
        }
        if (field.validationRules.pattern) {
          validators.push(Validators.pattern(field.validationRules.pattern));
        }
      }

      let defaultValue: any;
      switch (field.type) {
        case 'checkbox':
          defaultValue = false;
          break;
        case 'rating':
          defaultValue = 0;
          break;
        case 'multi_checkbox':
          defaultValue = [] as string[];
          break;
        default:
          defaultValue = '';
      }

      this.fillForm.addControl(`field_${field.id}`, this.fb.control(defaultValue, validators));
      this.fieldVisibility[`field_${field.id}`] = true;
    });

    // Add submitter fields for public forms
    if (this.isPublic) {
      this.fillForm.addControl('submitterName', this.fb.control(''));
      this.fillForm.addControl('submitterEmail', this.fb.control('', Validators.email));
    }

    // Watch value changes for conditional visibility
    this.fillForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.evaluateVisibility();
    });
    this.evaluateVisibility();
  }

  // ── Conditional visibility ────────────────────────────────

  private evaluateVisibility(): void {
    const fields = this.getFields();
    fields.forEach(field => {
      if (!field.showIf || field.type === 'heading' || field.type === 'separator') {
        this.fieldVisibility[`field_${field.id}`] = true;
        return;
      }
      this.fieldVisibility[`field_${field.id}`] = this.evaluateShowIf(field.showIf, fields);
    });
  }

  private evaluateShowIf(showIf: FormFieldShowIf, fields: FormField[]): boolean {
    // Find the source field to get its control key
    const sourceField = fields.find(f => f.id === showIf.fieldId);
    if (!sourceField) return true;

    const controlKey = `field_${sourceField.id}`;
    const control = this.fillForm.get(controlKey);
    if (!control) return true;

    const currentValue = control.value;
    const valueStr = currentValue != null ? String(currentValue) : '';

    switch (showIf.operator) {
      case 'equals':
        return valueStr === (showIf.value || '');
      case 'not_equals':
        return valueStr !== (showIf.value || '');
      case 'contains':
        return valueStr.toLowerCase().includes((showIf.value || '').toLowerCase());
      case 'not_empty':
        return valueStr.length > 0 && valueStr !== 'false' && valueStr !== '0';
      case 'is_empty':
        return valueStr.length === 0 || valueStr === 'false' || valueStr === '0';
      default:
        return true;
    }
  }

  isFieldVisible(field: FormField): boolean {
    if (field.type === 'heading' || field.type === 'separator') return true;
    return this.fieldVisibility[`field_${field.id}`] !== false;
  }

  // ── Multi-checkbox helpers ────────────────────────────────

  isOptionChecked(field: FormField, option: string): boolean {
    const current: string[] = this.fillForm.get(`field_${field.id}`)?.value || [];
    return Array.isArray(current) && current.includes(option);
  }

  toggleCheckboxOption(field: FormField, option: string): void {
    const control = this.fillForm.get(`field_${field.id}`);
    if (!control) return;
    const current: string[] = Array.isArray(control.value) ? [...control.value] : [];
    const idx = current.indexOf(option);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push(option);
    }
    control.setValue(current);
    control.markAsTouched();
  }

  // ── Field helpers ─────────────────────────────────────────

  getFields(): FormField[] {
    return (this.formData?.fields as FormField[]) || [];
  }

  getFieldControl(field: FormField) {
    return this.fillForm.get(`field_${field.id}`);
  }

  setRating(field: FormField, value: number): void {
    this.fillForm.get(`field_${field.id}`)?.setValue(value);
  }

  getRating(field: FormField): number {
    return this.fillForm.get(`field_${field.id}`)?.value || 0;
  }

  submit(): void {
    if (this.isPreview) {
      this.notify.info('Vorschau-Modus – Absenden nicht möglich');
      return;
    }

    if (this.fillForm.invalid) {
      this.notify.warning('Bitte fülle alle Pflichtfelder korrekt aus');
      this.fillForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    const fields = this.getFields().filter(f =>
      f.type !== 'heading' && f.type !== 'separator' && this.isFieldVisible(f),
    );
    const answers = fields.map(f => {
      let value = this.fillForm.get(`field_${f.id}`)?.value;
      // Multi-checkbox: join array to comma-separated string
      if (f.type === 'multi_checkbox' && Array.isArray(value)) {
        value = value.join(',');
      }
      return { fieldId: f.id!, value };
    });

    const payload: any = { answers };
    if (this.isPublic) {
      payload.submitterName = this.fillForm.get('submitterName')?.value;
      payload.submitterEmail = this.fillForm.get('submitterEmail')?.value;
    }

    const obs$ = this.isPublic
      ? this.formService.submitPublicForm(this.publicGuid!, payload)
      : this.formService.submitForm(this.formId!, payload);

    (obs$ as any).pipe(takeUntil(this.destroy$)).subscribe({
      next: (result: any) => {
        this.submitting = false;
        this.submitted = true;
        if (result?.message) {
          this.confirmationText = result.message;
        }
      },
      error: (err: any) => {
        this.submitting = false;
        const msg = err?.error?.message || 'Fehler beim Absenden';
        this.notify.error(msg);
      },
    });
  }
}
