import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, FormsModule, AbstractControl } from '@angular/forms';
import { MaterialModule } from '@modules/material.module';
import { BaseComponent } from '@shared/components/base.component';
import { FormService } from '@core/services/form.service';
import { DialogHelperService } from '@core/services/dialog-helper.service';
import { NotificationService } from '@core/services/notification.service';
import {
  AddressFieldRole,
  Form,
  FormField,
  FormFieldType,
  FormFieldValidationRules,
  FormStatus,
} from '@core/models/form';
import { takeUntil } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';
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

interface AddressPresetField {
  role: AddressFieldRole;
  type: FormFieldType;
  label: string;
  placeholder: string;
  optionalField?: boolean;
  options?: string[] | null;
  validationRules: FormFieldValidationRules;
}

interface EditorListItem {
  kind: 'field' | 'addressBlock';
  indexes: number[];
  blockId?: string;
}

const NAME_PATTERN = "^[A-Za-zÀ-ÖØ-öø-ÿÄÖÜäöüß'’\\-\\s]{2,80}$";
const STREET_PATTERN = "^[A-Za-zÀ-ÖØ-öø-ÿÄÖÜäöüß0-9'’\\-\\./\\s]{3,120}$";
const HOUSE_NUMBER_PATTERN = "^[0-9A-Za-zÀ-ÖØ-öø-ÿÄÖÜäöüß\\-/]{1,10}$";
const POSTAL_CODE_PATTERN = '^\\d{5}$';
const CITY_PATTERN = "^[A-Za-zÀ-ÖØ-öø-ÿÄÖÜäöüß'’\\-\\s]{2,100}$";

const ADDRESS_BLOCK_PRESET_FIELDS: AddressPresetField[] = [
  {
    role: 'salutation',
    type: 'radio',
    label: 'Anrede',
    placeholder: '',
    options: ['Herr', 'Frau', 'Divers'],
    validationRules: { minLength: 2, maxLength: 20 },
  },
  {
    role: 'title',
    type: 'select',
    label: 'Titel',
    placeholder: '– kein Titel –',
    optionalField: true,
    options: ['– kein Titel –', 'Dr.', 'Prof.', 'Prof. Dr.'],
    validationRules: { maxLength: 30 },
  },
  {
    role: 'firstName',
    type: 'text_short',
    label: 'Vorname',
    placeholder: 'z. B. Michael',
    validationRules: { minLength: 2, maxLength: 80, pattern: NAME_PATTERN },
  },
  {
    role: 'lastName',
    type: 'text_short',
    label: 'Name',
    placeholder: 'z. B. Mustermann',
    validationRules: { minLength: 2, maxLength: 80, pattern: NAME_PATTERN },
  },
  {
    role: 'street',
    type: 'text_short',
    label: 'Straße',
    placeholder: 'z. B. Hauptstraße',
    validationRules: { minLength: 3, maxLength: 120, pattern: STREET_PATTERN },
  },
  {
    role: 'houseNumber',
    type: 'text_short',
    label: 'Hausnr.',
    placeholder: 'z. B. 12a',
    validationRules: { minLength: 1, maxLength: 10, pattern: HOUSE_NUMBER_PATTERN },
  },
  {
    role: 'addressLine2',
    type: 'text_short',
    label: 'Adresszusatz',
    placeholder: 'z. B. c/o, Hinterhaus, Etage …',
    optionalField: true,
    validationRules: { maxLength: 120 },
  },
  {
    role: 'postalCode',
    type: 'text_short',
    label: 'PLZ',
    placeholder: 'z. B. 37073',
    validationRules: { minLength: 5, maxLength: 5, pattern: POSTAL_CODE_PATTERN },
  },
  {
    role: 'city',
    type: 'text_short',
    label: 'Ort',
    placeholder: 'Wird bei PLZ-Eingabe ergänzt',
    validationRules: { minLength: 2, maxLength: 100, pattern: CITY_PATTERN },
  },
  {
    role: 'country',
    type: 'select',
    label: 'Land',
    placeholder: 'Deutschland',
    optionalField: true,
    options: ['Deutschland', 'Österreich', 'Schweiz', 'Liechtenstein', 'Luxemburg', 'Andere'],
    validationRules: { minLength: 2, maxLength: 80 },
  },
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
  readonly formTitleMaxLength = 255;
  readonly descriptionMaxLength = 4000;
  readonly confirmationTextMaxLength = 2000;
  readonly fieldLabelMaxLength = 255;
  readonly fieldPlaceholderMaxLength = 4000;

  form!: FormGroup;
  formId: number | null = null;
  isEdit = false;
  saving = false;
  loading = true;
  fieldTypes = FIELD_TYPE_OPTIONS;
  readonly addressBlockFieldCount = ADDRESS_BLOCK_PRESET_FIELDS.length;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private formService: FormService,
    private dialogHelper: DialogHelperService,
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
      title: ['', [Validators.required, Validators.maxLength(this.formTitleMaxLength)]],
      description: ['', [Validators.maxLength(this.descriptionMaxLength)]],
      status: ['draft' as FormStatus],
      openDate: [null],
      closeDate: [null],
      allowAnonymous: [false],
      allowMultipleSubmissions: [false],
      maxSubmissions: [null as number | null],
      notifyOnSubmission: [false],
      confirmationText: ['Danke für deine Teilnahme!', [Validators.maxLength(this.confirmationTextMaxLength)]],
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
    const labelValidators = this.isLabelRequiredForType(type)
      ? [Validators.required, Validators.maxLength(this.fieldLabelMaxLength)]
      : [Validators.maxLength(this.fieldLabelMaxLength)];
    const group = this.fb.group({
      id: [null as number | null],
      type: [type, Validators.required],
      label: [type === 'separator' ? 'Trennlinie' : '', labelValidators],
      placeholder: ['', [Validators.maxLength(this.fieldPlaceholderMaxLength)]],
      required: [false],
      options: [null as string[] | null],
      sortOrder: [this.fields.length],
      validationRules: [null],
      showIf: [null],
    });
    this.fields.push(group);
  }

  addStandardAddressBlock(requiredFields = true): void {
    if (this.hasStandardAddressBlock()) {
      this.notify.info('Der Adressblock ist bereits vorhanden und kann nur einmal eingefügt werden.');
      return;
    }

    const blockId = this.createAddressBlockId();

    ADDRESS_BLOCK_PRESET_FIELDS.forEach((preset, index) => {
      const shouldRequireField = requiredFields && !preset.optionalField;
      const validationRules: FormFieldValidationRules = {
        ...preset.validationRules,
        addressRole: preset.role,
        addressBlockId: blockId,
      };

      const fieldData: FormField = {
        type: preset.type,
        label: preset.label,
        placeholder: preset.placeholder,
        required: shouldRequireField,
        options: preset.options || null,
        sortOrder: this.fields.length + index,
        validationRules,
        showIf: null,
      };

      this.addFieldFromData(fieldData);
    });

    this.recalcSortOrder();
    this.form.markAsDirty();

    const modeText = requiredFields ? 'mit Pflichtfeldern' : 'ohne Pflichtfelder';
    this.notify.success(`Adress-Standardblock (${this.addressBlockFieldCount} Felder, ${modeText}) eingefügt`);
  }

  private createAddressBlockId(): string {
    return `addr_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  }

  hasStandardAddressBlock(): boolean {
    return this.fields.controls.some(control => this.isAddressBlockControl(control));
  }

  getEditorItems(): EditorListItem[] {
    const items: EditorListItem[] = [];
    let index = 0;

    while (index < this.fields.length) {
      const control = this.fields.at(index);
      const blockId = this.getAddressBlockId(control);

      if (!blockId) {
        items.push({ kind: 'field', indexes: [index] });
        index += 1;
        continue;
      }

      const indexes: number[] = [];
      let blockIndex = index;
      while (blockIndex < this.fields.length && this.getAddressBlockId(this.fields.at(blockIndex)) === blockId) {
        indexes.push(blockIndex);
        blockIndex += 1;
      }

      items.push({ kind: 'addressBlock', indexes, blockId });
      index = blockIndex;
    }

    return items;
  }

  isAddressBlockItem(item: EditorListItem): boolean {
    return item.kind === 'addressBlock';
  }

  getFieldControlAt(index: number): AbstractControl {
    return this.fields.at(index);
  }

  getFieldIndexFromItem(item: EditorListItem): number {
    return item.indexes[0];
  }

  getAddressBlockControls(item: EditorListItem): Array<{ index: number; control: AbstractControl }> {
    return item.indexes.map(index => ({ index, control: this.fields.at(index) }));
  }

  removeAddressBlock(blockId: string): void {
    const indexes = this.fields.controls
      .map((control, index) => ({ control, index }))
      .filter(({ control }) => this.getAddressBlockId(control) === blockId)
      .map(({ index }) => index)
      .sort((a, b) => b - a);

    indexes.forEach(index => this.fields.removeAt(index));
    this.recalcSortOrder();
    this.form.markAsDirty();
  }

  setAddressBlockRequired(blockId: string, required: boolean): void {
    this.fields.controls.forEach(control => {
      if (this.getAddressBlockId(control) !== blockId) {
        return;
      }

      const role = control.get('validationRules')?.value?.addressRole as AddressFieldRole | undefined;
      if (role && this.isOptionalAddressRole(role)) {
        control.get('required')?.setValue(false);
        return;
      }

      control.get('required')?.setValue(required);
    });

    this.form.markAsDirty();
  }

  isAddressBlockFullyRequired(blockId: string): boolean {
    const relevantControls = this.fields.controls.filter(control => this.getAddressBlockId(control) === blockId);
    return relevantControls
      .filter(control => {
        const role = control.get('validationRules')?.value?.addressRole as AddressFieldRole | undefined;
        return !role || !this.isOptionalAddressRole(role);
      })
      .every(control => control.get('required')?.value === true);
  }

  getAddressRoleLabel(role: AddressFieldRole | undefined): string {
    if (!role) {
      return 'Feld';
    }

    return ADDRESS_BLOCK_PRESET_FIELDS.find(field => field.role === role)?.label || role;
  }

  isOptionalAddressRole(role: AddressFieldRole): boolean {
    return !!ADDRESS_BLOCK_PRESET_FIELDS.find(field => field.role === role)?.optionalField;
  }

  getAddressBlockRole(control: AbstractControl): AddressFieldRole | undefined {
    return control.get('validationRules')?.value?.addressRole as AddressFieldRole | undefined;
  }

  private isAddressBlockControl(control: AbstractControl): boolean {
    return !!this.getAddressBlockId(control);
  }

  private getAddressBlockId(control: AbstractControl): string | null {
    return control.get('validationRules')?.value?.addressBlockId || null;
  }

  private addFieldFromData(field: FormField): void {
    const labelValidators = this.isLabelRequiredForType(field.type)
      ? [Validators.required, Validators.maxLength(this.fieldLabelMaxLength)]
      : [Validators.maxLength(this.fieldLabelMaxLength)];
    const group = this.fb.group({
      id: [field.id || null],
      type: [field.type, Validators.required],
      label: [field.label || (field.type === 'separator' ? 'Trennlinie' : ''), labelValidators],
      placeholder: [field.placeholder || '', [Validators.maxLength(this.fieldPlaceholderMaxLength)]],
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
    const editorItems = this.getEditorItems();
    const reorderedItems = [...editorItems];
    moveItemInArray(reorderedItems, event.previousIndex, event.currentIndex);

    const originalControls = [...this.fields.controls];
    this.fields.clear();

    reorderedItems.forEach(item => {
      item.indexes.forEach(index => {
        this.fields.push(originalControls[index]);
      });
    });

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

  private isLabelRequiredForType(type: FormFieldType): boolean {
    return type !== 'separator';
  }

  onFieldTypeChanged(fieldIndex: number, type: FormFieldType): void {
    const field = this.fields.at(fieldIndex);
    const labelControl = field.get('label');
    if (!labelControl) return;

    if (this.isLabelRequiredForType(type)) {
      labelControl.setValidators([Validators.required, Validators.maxLength(this.fieldLabelMaxLength)]);
      if (!labelControl.value || String(labelControl.value).trim().length === 0) {
        labelControl.setValue('');
      }
    } else {
      labelControl.setValidators([Validators.maxLength(this.fieldLabelMaxLength)]);
      if (!labelControl.value || String(labelControl.value).trim().length === 0) {
        labelControl.setValue('Trennlinie');
      }
    }

    labelControl.updateValueAndValidity({ emitEvent: false });
  }

  private getInvalidFieldsMessage(): string {
    const requiredHints: string[] = [];
    const lengthHints: string[] = [];

    const titleControl = this.form.get('title');
    if (titleControl?.invalid) {
      if (titleControl.hasError('required')) {
        requiredHints.push('Formulartitel fehlt');
      }
      if (titleControl.hasError('maxlength')) {
        lengthHints.push(`Formulartitel zu lang (max. ${this.formTitleMaxLength})`);
      }
    }

    const descriptionControl = this.form.get('description');
    if (descriptionControl?.hasError('maxlength')) {
      lengthHints.push(`Beschreibung zu lang (max. ${this.descriptionMaxLength})`);
    }

    const confirmationTextControl = this.form.get('confirmationText');
    if (confirmationTextControl?.hasError('maxlength')) {
      lengthHints.push(`Bestätigungstext zu lang (max. ${this.confirmationTextMaxLength})`);
    }

    this.fields.controls.forEach((control, idx) => {
      const questionNumber = idx + 1;
      const type = control.get('type')?.value as FormFieldType;
      const labelControl = control.get('label');
      const placeholderControl = control.get('placeholder');

      if (this.isLabelRequiredForType(type) && labelControl?.hasError('required')) {
        requiredHints.push(`Frage ${questionNumber}: Feldbezeichnung fehlt`);
      }

      if (labelControl?.hasError('maxlength')) {
        lengthHints.push(`Frage ${questionNumber}: Feldbezeichnung zu lang (max. ${this.fieldLabelMaxLength})`);
      }

      if (placeholderControl?.hasError('maxlength')) {
        lengthHints.push(`Frage ${questionNumber}: Platzhalter zu lang (max. ${this.fieldPlaceholderMaxLength})`);
      }
    });

    const hints = [...requiredHints, ...lengthHints];

    if (hints.length === 0) {
      return 'Bitte prüfe die markierten Felder.';
    }

    return `Bitte korrigieren: ${hints.join(' · ')}`;
  }

  getLength(value: unknown): number {
    return String(value ?? '').length;
  }

  shouldShowSubmitterDuplicateWarning(): boolean {
    // If anonymous participation is enabled, system submitter fields are hidden.
    if (this.form.get('allowAnonymous')?.value) {
      return false;
    }

    return this.hasCustomNameField() || this.hasCustomEmailField();
  }

  getSubmitterDuplicateWarningText(): string {
    const hasNameField = this.hasCustomNameField();
    const hasEmailField = this.hasCustomEmailField();

    if (hasNameField && hasEmailField) {
      return 'Du hast bereits eigene Name- und E-Mail-Felder. Zusätzlich würden systemseitige Absenderfelder angezeigt.';
    }
    if (hasEmailField) {
      return 'Du hast bereits ein eigenes E-Mail-Feld. Zusätzlich würde ein systemseitiges E-Mail-Feld angezeigt.';
    }

    return 'Du hast bereits eigene Namensfelder. Zusätzlich würde ein systemseitiges Namensfeld angezeigt.';
  }

  enableAnonymousParticipation(): void {
    const control = this.form.get('allowAnonymous');
    if (!control || control.value === true) {
      return;
    }

    control.setValue(true);
    control.markAsDirty();
    this.form.markAsDirty();
    this.notify.info('Anonyme Teilnahme wurde aktiviert. System-Absenderfelder werden ausgeblendet.');
  }

  private hasCustomNameField(): boolean {
    return this.fields.controls.some(control => {
      const type = control.get('type')?.value as FormFieldType;
      if (this.isDecorativeField(type)) {
        return false;
      }

      const label = this.normalizeLabel(control.get('label')?.value);
      if (!label) {
        return false;
      }

      return /\b(vorname|nachname|name|fullname|full name)\b/i.test(label);
    });
  }

  private hasCustomEmailField(): boolean {
    return this.fields.controls.some(control => {
      const type = control.get('type')?.value as FormFieldType;
      if (this.isDecorativeField(type)) {
        return false;
      }

      if (type === 'email') {
        return true;
      }

      const label = this.normalizeLabel(control.get('label')?.value);
      return /\b(e-?mail|mailadresse|mail)\b/i.test(label);
    });
  }

  private normalizeLabel(value: unknown): string {
    return String(value ?? '').trim().toLowerCase();
  }

  private getBackendDebugMessage(error: unknown): string {
    const err = error as {
      status?: number;
      message?: string;
      error?: {
        message?: string;
        debugTag?: string;
        details?: { cause?: string };
        errors?: Array<{ msg?: string; path?: string }>;
      };
    };

    const backendMessage = err?.error?.message || '';
    const backendCause = err?.error?.details?.cause || '';
    const validationSummary = (err?.error?.errors || [])
      .map(e => [e.path, e.msg].filter(Boolean).join(': '))
      .filter(Boolean)
      .join(' | ');
    const debugTag = err?.error?.debugTag ? `[${err.error.debugTag}]` : '';

    const parts = [debugTag, backendMessage, backendCause, validationSummary, err?.message]
      .map(v => String(v || '').trim())
      .filter(Boolean);

    if (parts.length === 0) {
      return 'Unbekannter Fehler';
    }

    return parts.join(' — ');
  }

  // ── Options management for select fields ──────────────────

  trackByField(index: number, field: AbstractControl): number {
    return field.get('id')?.value ?? field.get('sortOrder')?.value ?? index;
  }

  trackByEditorItem(index: number, item: EditorListItem): string {
    return item.blockId || `field-${item.indexes[0]}-${index}`;
  }

  trackByOptionIndex(index: number): number {
    return index;
  }

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
      this.form.markAllAsTouched();
      this.fields.controls.forEach(control => control.markAllAsTouched());
      this.notify.warning(this.getInvalidFieldsMessage(), 7000);
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
          void this.saveFields(saved.id)
            .then(result => {
              if (result.failedFields.length > 0) {
                const fieldList = result.failedFields.join(', ');
                this.notify.warning(
                  `Formular teilweise gespeichert. Betroffene Felder: ${fieldList}`,
                  10000,
                );
              }
            })
            .catch((error) => {
              this.notify.error(error);
            });
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

  private async saveFields(formId: number): Promise<{ failedFields: string[] }> {
    const controls = this.fields.controls as FormGroup[];
    const failedFields = new Set<string>();

    const getControlLabel = (ctrl: FormGroup, fallback: string): string => {
      const label = String(ctrl.get('label')?.value || '').trim();
      return label || fallback;
    };

    // 0) Delete fields removed in editor (present on server, missing locally)
    const localPersistedIds = new Set(
      controls
        .map(ctrl => ctrl.get('id')?.value as number | null)
        .filter((id): id is number => !!id),
    );

    const currentForm = await firstValueFrom(this.formService.getFormById(formId));
    const serverFieldById = new Map(
      (currentForm.fields || [])
        .filter(field => !!field.id)
        .map(field => [field.id as number, field]),
    );

    const serverFieldIds = (currentForm.fields || [])
      .map(field => field.id)
      .filter((id): id is number => !!id);

    for (const serverId of serverFieldIds) {
      if (!localPersistedIds.has(serverId)) {
        try {
          await firstValueFrom(this.formService.deleteField(formId, serverId));
        } catch {
          // Keep undeletable fields (e.g. referenced by existing submissions) and continue saving.
          const field = serverFieldById.get(serverId);
          failedFields.add(field?.label?.trim() || `Feld #${serverId}`);
        }
      }
    }

    // 1) Persist existing fields
    for (const ctrl of controls) {
      const id = ctrl.get('id')?.value as number | null;
      if (!id) continue;
      try {
        await firstValueFrom(this.formService.updateField(formId, id, ctrl.value as FormField));
      } catch {
        failedFields.add(getControlLabel(ctrl, `Feld #${id}`));
      }
    }

    // 2) Create new fields and write back generated IDs to prevent duplicate re-creates on next save
    for (const ctrl of controls) {
      const id = ctrl.get('id')?.value as number | null;
      if (id) continue;
      try {
        const created = await firstValueFrom(this.formService.addField(formId, ctrl.value as Omit<FormField, 'id' | 'formId'>));
        ctrl.get('id')?.setValue(created.id);
      } catch {
        failedFields.add(getControlLabel(ctrl, 'Neues Feld'));
      }
    }

    // 3) Reorder all persisted IDs (now includes newly created fields)
    const allIds = Array.from(new Set(
      controls
        .map(ctrl => Number(ctrl.get('id')?.value))
        .filter(id => Number.isInteger(id) && id > 0),
    ));

    if (allIds.length > 0) {
      try {
        await firstValueFrom(this.formService.reorderFields(formId, allIds));
      } catch (error) {
        const debugMessage = this.getBackendDebugMessage(error);
        // DEBUG-FORM-REORDER-TEMP: Temporary client-side diagnostics for reorder issues.
        // eslint-disable-next-line no-console
        console.error('[DEBUG-FORM-REORDER-TEMP][FRONTEND][REORDER_ERROR]', {
          formId,
          allIds,
          error,
          debugMessage,
        });
        failedFields.add(`Reihenfolge der Felder (${debugMessage})`);
      }
    }

    return { failedFields: Array.from(failedFields) };
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

    this.dialogHelper.confirm({
      title: 'Umfrage wirklich beenden?',
      message: 'Danach sind keine neuen Abgaben mehr möglich. Bereits eingegangene Ergebnisse bleiben erhalten und können weiterhin unter „Ergebnisse“ eingesehen werden.',
      confirmButtonText: 'Beenden',
      cancelButtonText: 'Abbrechen'
    }).pipe(
      takeUntil(this.destroy$)
    ).subscribe(confirmed => {
      if (!confirmed) {
        return;
      }

      this.formService.updateForm(this.formId!, { status: 'closed' })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.form.get('status')?.setValue('closed');
            this.notify.success('Umfrage beendet. Die Ergebnisse können weiter eingesehen werden.');
            this.router.navigate(['/forms', this.formId, 'results']);
          },
          error: () => this.notify.error('Fehler beim Beenden der Umfrage'),
        });
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
