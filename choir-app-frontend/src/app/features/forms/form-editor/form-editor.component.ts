import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MaterialModule } from '@modules/material.module';
import { BaseComponent } from '@shared/components/base.component';
import { FormService } from '@core/services/form.service';
import { NotificationService } from '@core/services/notification.service';
import { Form, FormField, FormFieldType, FormStatus } from '@core/models/form';
import { takeUntil } from 'rxjs/operators';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';

const FIELD_TYPE_OPTIONS: { value: FormFieldType; label: string; icon: string }[] = [
  { value: 'text_short', label: 'Kurztext', icon: 'short_text' },
  { value: 'text_long', label: 'Langtext', icon: 'notes' },
  { value: 'number', label: 'Zahl', icon: 'pin' },
  { value: 'checkbox', label: 'Checkbox', icon: 'check_box' },
  { value: 'select', label: 'Dropdown', icon: 'list' },
  { value: 'radio', label: 'Einfachauswahl', icon: 'radio_button_checked' },
  { value: 'multi_checkbox', label: 'Mehrfachauswahl', icon: 'checklist' },
  { value: 'date', label: 'Datum', icon: 'calendar_today' },
  { value: 'time', label: 'Uhrzeit', icon: 'schedule' },
  { value: 'rating', label: 'Bewertung', icon: 'star' },
  { value: 'email', label: 'E-Mail', icon: 'email' },
  { value: 'heading', label: 'Überschrift', icon: 'title' },
  { value: 'separator', label: 'Trennlinie', icon: 'horizontal_rule' },
];

@Component({
  selector: 'app-form-editor',
  standalone: true,
  imports: [
    CommonModule, RouterModule, MaterialModule,
    ReactiveFormsModule, FormsModule, DragDropModule,
  ],
  templateUrl: './form-editor.component.html',
  styleUrls: ['./form-editor.component.scss'],
})
export class FormEditorComponent extends BaseComponent implements OnInit {
  form!: FormGroup;
  formId: number | null = null;
  isEdit = false;
  saving = false;
  loading = true;
  fieldTypes = FIELD_TYPE_OPTIONS;

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
    this.initForm();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.formId = parseInt(id, 10);
      this.isEdit = true;
      this.loadForm();
    } else {
      this.loading = false;
    }
  }

  private initForm(): void {
    this.form = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      status: ['draft' as FormStatus],
      openDate: [null],
      closeDate: [null],
      allowAnonymous: [false],
      allowMultipleSubmissions: [false],
      maxSubmissions: [null as number | null],
      notifyOnSubmission: [false],
      confirmationText: ['Danke für deine Teilnahme!'],
      fields: this.fb.array([]),
    });
  }

  get fields(): FormArray {
    return this.form.get('fields') as FormArray;
  }

  private loadForm(): void {
    this.formService.getFormById(this.formId!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (formData: Form) => {
          this.form.patchValue({
            title: formData.title,
            description: formData.description,
            status: formData.status,
            openDate: formData.openDate ? new Date(formData.openDate) : null,
            closeDate: formData.closeDate ? new Date(formData.closeDate) : null,
            allowAnonymous: formData.allowAnonymous,
            allowMultipleSubmissions: formData.allowMultipleSubmissions,
            maxSubmissions: formData.maxSubmissions || null,
            notifyOnSubmission: formData.notifyOnSubmission,
            confirmationText: formData.confirmationText,
          });

          // Clear and rebuild fields array
          this.fields.clear();
          (formData.fields || []).forEach(f => this.addFieldFromData(f));

          this.loading = false;
        },
        error: () => {
          this.notify.error('Formular konnte nicht geladen werden');
          this.loading = false;
        },
      });
  }

  addField(type: FormFieldType = 'text_short'): void {
    const group = this.fb.group({
      id: [null as number | null],
      type: [type, Validators.required],
      label: ['', Validators.required],
      placeholder: [''],
      required: [false],
      options: [null as string[] | null],
      sortOrder: [this.fields.length],
      validationRules: [null],
      showIf: [null],
    });
    this.fields.push(group);
  }

  private addFieldFromData(field: FormField): void {
    const group = this.fb.group({
      id: [field.id || null],
      type: [field.type, Validators.required],
      label: [field.label, Validators.required],
      placeholder: [field.placeholder || ''],
      required: [field.required],
      options: [field.options || null],
      sortOrder: [field.sortOrder],
      validationRules: [field.validationRules || null],
      showIf: [field.showIf || null],
    });
    this.fields.push(group);
  }

  removeField(index: number): void {
    this.fields.removeAt(index);
    this.recalcSortOrder();
  }

  dropField(event: CdkDragDrop<FormGroup[]>): void {
    moveItemInArray(this.fields.controls, event.previousIndex, event.currentIndex);
    this.recalcSortOrder();
  }

  private recalcSortOrder(): void {
    this.fields.controls.forEach((ctrl, idx) => {
      ctrl.get('sortOrder')?.setValue(idx);
    });
  }

  needsOptions(type: FormFieldType): boolean {
    return type === 'select' || type === 'radio' || type === 'multi_checkbox';
  }

  isDecorativeField(type: FormFieldType): boolean {
    return type === 'heading' || type === 'separator';
  }

  getFieldTypeLabel(type: FormFieldType): string {
    return FIELD_TYPE_OPTIONS.find(t => t.value === type)?.label || type;
  }

  getFieldTypeIcon(type: FormFieldType): string {
    return FIELD_TYPE_OPTIONS.find(t => t.value === type)?.icon || 'help';
  }

  // ── Options management for select fields ──────────────────

  getOptions(index: number): string[] {
    return this.fields.at(index).get('options')?.value || [];
  }

  addOption(fieldIndex: number): void {
    const options = [...this.getOptions(fieldIndex), ''];
    this.fields.at(fieldIndex).get('options')?.setValue(options);
  }

  updateOption(fieldIndex: number, optionIndex: number, value: string): void {
    const options = [...this.getOptions(fieldIndex)];
    options[optionIndex] = value;
    this.fields.at(fieldIndex).get('options')?.setValue(options);
  }

  removeOption(fieldIndex: number, optionIndex: number): void {
    const options = this.getOptions(fieldIndex).filter((_: string, i: number) => i !== optionIndex);
    this.fields.at(fieldIndex).get('options')?.setValue(options);
  }

  // ── Conditional Visibility (showIf) ───────────────────────

  getPreviousFields(currentIndex: number): { id: number | null; sortOrder: number; label: string }[] {
    return this.fields.controls
      .slice(0, currentIndex)
      .filter(c => !this.isDecorativeField(c.get('type')?.value))
      .map(c => ({
        id: c.get('id')?.value,
        sortOrder: c.get('sortOrder')?.value,
        label: c.get('label')?.value,
      }));
  }

  toggleShowIf(fieldIndex: number, enabled: boolean): void {
    const field = this.fields.at(fieldIndex);
    if (enabled) {
      const prev = this.getPreviousFields(fieldIndex);
      field.get('showIf')?.setValue({
        fieldId: prev.length > 0 ? (prev[0].id ?? prev[0].sortOrder) : null,
        operator: 'not_empty',
        value: '',
      });
    } else {
      field.get('showIf')?.setValue(null);
    }
  }

  updateShowIf(fieldIndex: number, key: string, value: any): void {
    const field = this.fields.at(fieldIndex);
    const current = { ...(field.get('showIf')?.value || {}) };
    current[key] = value;
    field.get('showIf')?.setValue(current);
  }

  // ── Form Duplication ──────────────────────────────────────

  duplicateForm(): void {
    if (!this.formId) return;
    this.formService.duplicateForm(this.formId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (newForm: Form) => {
          this.notify.success('Formular dupliziert');
          this.router.navigate(['/forms', newForm.id, 'edit']);
        },
        error: () => this.notify.error('Fehler beim Duplizieren'),
      });
  }

  // ── Save ──────────────────────────────────────────────────

  save(): void {
    if (this.form.invalid) {
      this.notify.warning('Bitte fülle alle Pflichtfelder aus');
      return;
    }

    this.saving = true;
    const data = this.form.value;

    // Convert dates to ISO strings
    if (data.openDate instanceof Date) {
      data.openDate = data.openDate.toISOString();
    }
    if (data.closeDate instanceof Date) {
      data.closeDate = data.closeDate.toISOString();
    }

    const obs$ = this.isEdit
      ? this.formService.updateForm(this.formId!, data)
      : this.formService.createForm(data);

    obs$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (saved: Form) => {
        this.saving = false;
        this.notify.success(this.isEdit ? 'Formular aktualisiert' : 'Formular erstellt');

        // If new form with fields, save them now
        if (!this.isEdit && data.fields?.length) {
          // Fields were sent inline with create, but we need the form ID for redirect
          this.router.navigate(['/forms', saved.id, 'edit']);
        } else if (this.isEdit) {
          // In edit mode, save fields individually
          this.saveFields(saved.id);
        } else {
          this.router.navigate(['/forms', saved.id, 'edit']);
        }
      },
      error: () => {
        this.saving = false;
        this.notify.error('Fehler beim Speichern');
      },
    });
  }

  private saveFields(formId: number): void {
    // For simplicity in MVP, we re-create: delete-all-then-add approach
    // This is simpler than tracking diffs
    const fields = this.fields.value as FormField[];

    // For existing fields with IDs, update; for new ones, create
    const existingFields = fields.filter(f => f.id);
    const newFields = fields.filter(f => !f.id);

    // Update existing
    existingFields.forEach(f => {
      this.formService.updateField(formId, f.id!, f)
        .pipe(takeUntil(this.destroy$))
        .subscribe();
    });

    // Create new
    newFields.forEach(f => {
      this.formService.addField(formId, f)
        .pipe(takeUntil(this.destroy$))
        .subscribe();
    });

    // Reorder all
    const allIds = fields.filter(f => f.id).map(f => f.id!);
    if (allIds.length > 0) {
      this.formService.reorderFields(formId, allIds)
        .pipe(takeUntil(this.destroy$))
        .subscribe();
    }
  }

  publishForm(): void {
    if (!this.formId) return;
    this.formService.updateForm(this.formId, { status: 'published' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.form.get('status')?.setValue('published');
          this.notify.success('Formular veröffentlicht');
        },
        error: () => this.notify.error('Fehler beim Veröffentlichen'),
      });
  }

  closeForm(): void {
    if (!this.formId) return;
    this.formService.updateForm(this.formId, { status: 'closed' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.form.get('status')?.setValue('closed');
          this.notify.success('Formular geschlossen');
        },
        error: () => this.notify.error('Fehler beim Schließen'),
      });
  }

  copyPublicLink(): void {
    // Navigate to share URL
    if (!this.formId) return;
    this.formService.getFormById(this.formId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(f => {
        if (f.publicGuid) {
          const url = `${window.location.origin}/forms/public/${f.publicGuid}`;
          navigator.clipboard.writeText(url).then(() => {
            this.notify.success('Link in Zwischenablage kopiert');
          });
        }
      });
  }
}
