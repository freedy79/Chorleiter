import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { BaseComponent } from '@shared/components/base.component';
import { FormService } from '@core/services/form.service';
import { NotificationService } from '@core/services/notification.service';
import { AddressLookupService } from '@core/services/address-lookup.service';
import { AddressFieldRole, Form, FormField, FormFieldShowIf } from '@core/models/form';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-duplicate-submission-dialog',
  standalone: true,
  imports: [MaterialModule],
  template: `
    <h2 mat-dialog-title>Abgabe bereits vorhanden</h2>
    <mat-dialog-content>
      <p>Für diese E-Mail-Adresse existiert bereits eine Abgabe.</p>
      <p>Möchtest du deine bisherigen Angaben <strong>aktualisieren</strong> oder eine <strong>neue Abgabe</strong> einreichen?</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="'cancel'">Abbrechen</button>
      <button mat-stroked-button [mat-dialog-close]="'new'">Neu abgeben</button>
      <button mat-flat-button color="primary" [mat-dialog-close]="'update'">Aktualisieren</button>
    </mat-dialog-actions>
  `,
})
export class DuplicateSubmissionDialogComponent {}

interface RenderFormItem {
  kind: 'field' | 'addressBlock';
  fields: FormField[];
  blockId?: string;
}

@Component({
  selector: 'app-form-fill',
  standalone: true,
  imports: [CommonModule, RouterModule, MaterialModule, ReactiveFormsModule, FormsModule],
  templateUrl: './form-fill.component.html',
  styleUrls: ['./form-fill.component.scss'],
})
export class FormFillComponent extends BaseComponent implements OnInit {
  private static readonly DRAFT_STORAGE_PREFIX = 'form-fill-draft';

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
  showSubmitterFields = false;
  submitterFieldsAreRequired = false;

  // Rating helper
  ratingValues = [1, 2, 3, 4, 5];

  // Conditional visibility tracking
  private fieldVisibility: Record<string, boolean> = {};

  // Optional respondent copy via email field
  private emailFieldIds = new Set<number>();

  private readonly addressRoleToAutocomplete: Record<AddressFieldRole, string> = {
    salutation: 'honorific-prefix',
    title: 'honorific-suffix',
    firstName: 'given-name',
    lastName: 'family-name',
    street: 'address-line1',
    houseNumber: 'address-line1',
    addressLine2: 'address-line2',
    postalCode: 'postal-code',
    city: 'address-level2',
    country: 'country-name',
  };

  private readonly addressRoleIcons: Partial<Record<AddressFieldRole, string>> = {
    salutation: 'badge',
    title: 'workspace_premium',
    firstName: 'person',
    lastName: 'person_outline',
    street: 'home',
    houseNumber: 'tag',
    addressLine2: 'apartment',
    postalCode: 'markunread_mailbox',
    city: 'location_city',
    country: 'public',
  };

  addressLookupMessageByFieldId: Record<number, string> = {};
  addressLookupLoadingByFieldId: Record<number, boolean> = {};

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private formService: FormService,
    private notify: NotificationService,
    private addressLookupService: AddressLookupService,
    private dialog: MatDialog,
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

      if (field.type === 'email' && field.id) {
        this.emailFieldIds.add(field.id);
      }

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
          defaultValue = field.validationRules?.addressRole === 'country' ? 'Deutschland' : '';
      }

      this.fillForm.addControl(`field_${field.id}`, this.fb.control(defaultValue, validators));
      this.fieldVisibility[`field_${field.id}`] = true;
    });

    // Add submitter fields for public forms and preview (to reflect real behavior)
    this.showSubmitterFields = this.shouldShowSubmitterFields();
    this.submitterFieldsAreRequired = this.shouldRequireSubmitterFields();

    if (this.showSubmitterFields) {
      const submitterNameValidators = this.submitterFieldsAreRequired
        ? [Validators.required]
        : [];
      const submitterEmailValidators = this.submitterFieldsAreRequired
        ? [Validators.required, Validators.email]
        : [Validators.email];

      this.fillForm.addControl('submitterName', this.fb.control('', submitterNameValidators));
      this.fillForm.addControl('submitterEmail', this.fb.control('', submitterEmailValidators));
    }

    if (this.hasEmailField()) {
      this.fillForm.addControl('sendCopyToEmail', this.fb.control(false));
    }

    this.buildRenderItems();
    this.restoreDraft(fields);

    // Watch value changes for conditional visibility
    this.fillForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.evaluateVisibility();
      this.persistDraft();
    });
    this.evaluateVisibility();
  }

  private getDraftStorageKey(): string | null {
    if (this.isPreview) {
      return null;
    }

    if (this.isPublic && this.publicGuid) {
      return `${FormFillComponent.DRAFT_STORAGE_PREFIX}:public:${this.publicGuid}`;
    }

    if (this.formId != null) {
      return `${FormFillComponent.DRAFT_STORAGE_PREFIX}:internal:${this.formId}`;
    }

    return null;
  }

  private persistDraft(): void {
    const storageKey = this.getDraftStorageKey();
    if (!storageKey || !this.formData) {
      return;
    }

    const rawValues = this.fillForm.getRawValue();
    const fieldTypes = Object.fromEntries(
      this.getFields()
        .filter(field => field.id != null)
        .map(field => [`field_${field.id}`, field.type]),
    );

    const payload = {
      values: rawValues,
      fieldTypes,
      savedAt: new Date().toISOString(),
    };

    sessionStorage.setItem(storageKey, JSON.stringify(payload));
  }

  private restoreDraft(fields: FormField[]): void {
    const storageKey = this.getDraftStorageKey();
    if (!storageKey) {
      return;
    }

    const storedDraft = sessionStorage.getItem(storageKey);
    if (!storedDraft) {
      return;
    }

    try {
      const parsed = JSON.parse(storedDraft) as {
        values?: Record<string, unknown>;
        fieldTypes?: Record<string, string>;
      };
      const storedValues = parsed?.values;

      if (!storedValues || typeof storedValues !== 'object') {
        sessionStorage.removeItem(storageKey);
        return;
      }

      const patch: Record<string, unknown> = {};
      const availableControls = new Set(Object.keys(this.fillForm.controls));

      Object.entries(storedValues).forEach(([key, value]) => {
        if (!availableControls.has(key)) {
          return;
        }

        const fieldType = parsed.fieldTypes?.[key]
          || fields.find(field => `field_${field.id}` === key)?.type;

        patch[key] = this.normalizeDraftValue(fieldType, value);
      });

      if (Object.keys(patch).length === 0) {
        return;
      }

      this.fillForm.patchValue(patch, { emitEvent: false });
      this.evaluateVisibility();
      this.notify.info('Deine zuletzt eingegebenen Daten wurden wiederhergestellt.');
    } catch {
      sessionStorage.removeItem(storageKey);
    }
  }

  private normalizeDraftValue(fieldType: string | undefined, value: unknown): unknown {
    if (value == null) {
      return value;
    }

    switch (fieldType) {
      case 'checkbox':
        return value === true || value === 'true';
      case 'rating':
      case 'number':
        return typeof value === 'number' ? value : Number(value);
      case 'multi_checkbox':
        return Array.isArray(value) ? value : [];
      case 'date':
        return typeof value === 'string' || value instanceof Date
          ? new Date(value)
          : value;
      default:
        return value;
    }
  }

  private clearDraft(): void {
    const storageKey = this.getDraftStorageKey();
    if (!storageKey) {
      return;
    }

    sessionStorage.removeItem(storageKey);
  }

  private shouldShowSubmitterFields(): boolean {
    const isPublicOrPreview = this.isPublic || this.isPreview;
    const allowAnonymous = !!this.formData?.allowAnonymous;
    return isPublicOrPreview && !allowAnonymous;
  }

  private shouldRequireSubmitterFields(): boolean {
    return this.showSubmitterFields;
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

  private cachedRenderItems: RenderFormItem[] = [];

  getRenderItems(): RenderFormItem[] {
    return this.cachedRenderItems;
  }

  trackRenderItem(_index: number, item: RenderFormItem): string {
    return item.kind === 'addressBlock' ? `block-${item.blockId}` : `field-${item.fields[0]?.id}`;
  }

  private buildRenderItems(): void {
    const items: RenderFormItem[] = [];
    const fields = this.getFields();
    let index = 0;

    while (index < fields.length) {
      const field = fields[index];
      const blockId = field.validationRules?.addressBlockId;

      if (!blockId) {
        items.push({ kind: 'field', fields: [field] });
        index += 1;
        continue;
      }

      const grouped: FormField[] = [];
      let groupedIndex = index;
      while (groupedIndex < fields.length && fields[groupedIndex].validationRules?.addressBlockId === blockId) {
        grouped.push(fields[groupedIndex]);
        groupedIndex += 1;
      }

      items.push({ kind: 'addressBlock', fields: grouped, blockId });
      index = groupedIndex;
    }

    this.cachedRenderItems = items;
  }

  isAddressBlockItem(item: RenderFormItem): boolean {
    return item.kind === 'addressBlock';
  }

  getSingleField(item: RenderFormItem): FormField {
    return item.fields[0];
  }

  getAddressFieldByRole(item: RenderFormItem, role: AddressFieldRole): FormField | undefined {
    return item.fields.find(field => field.validationRules?.addressRole === role);
  }

  getFieldControl(field: FormField) {
    return this.fillForm.get(`field_${field.id}`);
  }

  getAddressRole(field: FormField): AddressFieldRole | null {
    return field.validationRules?.addressRole || null;
  }

  isAddressField(field: FormField): boolean {
    return !!this.getAddressRole(field);
  }

  isPersonalAddressRole(role: AddressFieldRole | null): boolean {
    return role === 'salutation' || role === 'title' || role === 'firstName' || role === 'lastName';
  }

  isAddressBlockStart(field: FormField): boolean {
    const blockId = field.validationRules?.addressBlockId;
    if (!blockId) {
      return false;
    }

    const allFields = this.getFields().filter(f => f.type !== 'heading' && f.type !== 'separator');
    const firstInBlock = allFields.find(f => f.validationRules?.addressBlockId === blockId);
    return firstInBlock?.id === field.id;
  }

  isAddressBlockEnd(field: FormField): boolean {
    const blockId = field.validationRules?.addressBlockId;
    if (!blockId) {
      return false;
    }

    const allFields = this.getFields().filter(f => f.type !== 'heading' && f.type !== 'separator');
    const inBlock = allFields.filter(f => f.validationRules?.addressBlockId === blockId);
    return inBlock[inBlock.length - 1]?.id === field.id;
  }

  getAddressAutocompleteToken(field: FormField): string | null {
    const role = this.getAddressRole(field);
    if (!role) {
      return null;
    }
    return this.addressRoleToAutocomplete[role] || null;
  }

  getAddressRoleIcon(field: FormField): string | null {
    const role = this.getAddressRole(field);
    if (!role) {
      return null;
    }
    return this.addressRoleIcons[role] || null;
  }

  getAddressLookupMessage(field: FormField): string {
    if (!field.id) {
      return '';
    }
    return this.addressLookupMessageByFieldId[field.id] || '';
  }

  isAddressLookupLoading(field: FormField): boolean {
    if (!field.id) {
      return false;
    }
    return this.addressLookupLoadingByFieldId[field.id] === true;
  }

  onAddressFieldBlur(field: FormField): void {
    const role = this.getAddressRole(field);
    if (!role || !field.id) {
      return;
    }

    if (role === 'postalCode') {
      this.resolveCityByPostalCode(field);
      return;
    }

    if (role === 'street' || role === 'houseNumber') {
      this.resolveAddressByStreet(field);
    }
  }

  private resolveCityByPostalCode(postalField: FormField): void {
    const postalControl = this.getFieldControl(postalField);
    const postalCode = String(postalControl?.value || '').trim();

    if (!/^\d{5}$/.test(postalCode) || !postalField.id) {
      return;
    }

    this.addressLookupLoadingByFieldId[postalField.id] = true;

    this.addressLookupService.resolveCityByPostalCode(postalCode)
      .pipe(takeUntil(this.destroy$))
      .subscribe((city) => {
        this.addressLookupLoadingByFieldId[postalField.id!] = false;

        if (!city) {
          this.addressLookupMessageByFieldId[postalField.id!] = '';
          return;
        }

        const cityField = this.findAddressFieldInSameBlock(postalField, 'city');
        const cityControl = cityField ? this.getFieldControl(cityField) : null;
        const currentCity = String(cityControl?.value || '').trim();

        if (cityControl && !currentCity) {
          cityControl.setValue(city);
          cityControl.markAsDirty();
        }

        this.addressLookupMessageByFieldId[postalField.id!] = `Wohnort erkannt: ${city}`;
      });
  }

  private resolveAddressByStreet(streetField: FormField): void {
    const streetOnlyField = this.findAddressFieldInSameBlock(streetField, 'street') || streetField;
    const houseNumberField = this.findAddressFieldInSameBlock(streetField, 'houseNumber');
    const streetControl = this.getFieldControl(streetOnlyField);
    const houseNumberControl = houseNumberField ? this.getFieldControl(houseNumberField) : null;
    const streetInput = String(streetControl?.value || '').trim();
    const houseNumber = String(houseNumberControl?.value || '').trim();
    const combinedStreetInput = [streetInput, houseNumber].filter(Boolean).join(' ').trim();

    if (!streetField.id || combinedStreetInput.length < 4) {
      return;
    }

    const postalField = this.findAddressFieldInSameBlock(streetField, 'postalCode');
    const cityField = this.findAddressFieldInSameBlock(streetField, 'city');
    const countryField = this.findAddressFieldInSameBlock(streetField, 'country');

    const postalCode = String(postalField ? this.getFieldControl(postalField)?.value : '').trim();
    const city = String(cityField ? this.getFieldControl(cityField)?.value : '').trim();

    this.addressLookupLoadingByFieldId[streetField.id] = true;

    this.addressLookupService.suggestAddressByStreet(combinedStreetInput, postalCode, city)
      .pipe(takeUntil(this.destroy$))
      .subscribe((suggestion) => {
        this.addressLookupLoadingByFieldId[streetField.id!] = false;

        if (!suggestion) {
          this.addressLookupMessageByFieldId[streetField.id!] = '';
          return;
        }

        if (suggestion.street && streetControl && String(streetControl.value || '').trim() !== suggestion.street) {
          streetControl.setValue(suggestion.street);
          streetControl.markAsDirty();
        }

        if (suggestion.houseNumber && houseNumberControl && !String(houseNumberControl.value || '').trim()) {
          houseNumberControl.setValue(suggestion.houseNumber);
          houseNumberControl.markAsDirty();
        }

        this.applyAddressSuggestionField(postalField, suggestion.postalCode);
        this.applyAddressSuggestionField(cityField, suggestion.city);
        this.applyAddressSuggestionField(countryField, suggestion.country);

        this.addressLookupMessageByFieldId[streetField.id!] = suggestion.displayName
          ? `Adresse ergänzt: ${suggestion.displayName}`
          : 'Adressvorschlag übernommen';
      });
  }

  private applyAddressSuggestionField(field: FormField | undefined, value?: string): void {
    if (!field || !value) {
      return;
    }

    const control = this.getFieldControl(field);
    if (!control) {
      return;
    }

    const current = String(control.value || '').trim();
    if (!current) {
      control.setValue(value);
      control.markAsDirty();
    }
  }

  private findAddressFieldInSameBlock(originField: FormField, role: AddressFieldRole): FormField | undefined {
    const blockId = originField.validationRules?.addressBlockId;
    if (!blockId) {
      return undefined;
    }

    return this.getFields().find(f =>
      f.validationRules?.addressBlockId === blockId
      && f.validationRules?.addressRole === role,
    );
  }

  hasEmailField(): boolean {
    return this.emailFieldIds.size > 0;
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
    const payload = this.buildPayload();

    if (this.isPublic && this.emailFieldIds.size > 0) {
      const emailValue = this.getFirstEmailFieldValue();
      if (emailValue) {
        this.formService.checkPublicDuplicate(this.publicGuid!, emailValue)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (result) => {
              if (result?.submissionId) {
                this.submitting = false;
                this.openDuplicateDialog(result.submissionId, payload);
              } else {
                this.doSubmit(payload);
              }
            },
            error: () => this.doSubmit(payload),
          });
        return;
      }
    }

    this.doSubmit(payload);
  }

  private buildPayload(): any {
    const fields = this.getFields().filter(f =>
      f.type !== 'heading' && f.type !== 'separator' && this.isFieldVisible(f),
    );
    const answers = fields.map(f => {
      let value = this.fillForm.get(`field_${f.id}`)?.value;
      if (f.type === 'multi_checkbox' && Array.isArray(value)) {
        value = value.join(',');
      }
      return { fieldId: f.id!, value };
    });

    const payload: any = { answers };
    if (this.isPublic && this.showSubmitterFields) {
      payload.submitterName = this.fillForm.get('submitterName')?.value;
      payload.submitterEmail = this.fillForm.get('submitterEmail')?.value;
    }
    if (this.hasEmailField()) {
      payload.sendCopyToEmail = !!this.fillForm.get('sendCopyToEmail')?.value;
    }
    return payload;
  }

  private getFirstEmailFieldValue(): string | null {
    for (const fieldId of this.emailFieldIds) {
      const value = String(this.fillForm.get(`field_${fieldId}`)?.value || '').trim();
      if (value) return value;
    }
    return null;
  }

  private openDuplicateDialog(submissionId: number, payload: any): void {
    const ref = this.dialog.open(DuplicateSubmissionDialogComponent, { width: '420px' });
    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((choice: string) => {
      if (choice === 'update') {
        this.submitting = true;
        this.doUpdate(submissionId, payload);
      } else if (choice === 'new') {
        this.submitting = true;
        this.doSubmit(payload);
      }
    });
  }

  private doSubmit(payload: any): void {
    const obs$ = this.isPublic
      ? this.formService.submitPublicForm(this.publicGuid!, payload)
      : this.formService.submitForm(this.formId!, payload);

    (obs$ as any).pipe(takeUntil(this.destroy$)).subscribe({
      next: (result: any) => this.onSubmitSuccess(result),
      error: (err: any) => this.onSubmitError(err),
    });
  }

  private doUpdate(submissionId: number, payload: any): void {
    this.formService.updatePublicSubmission(this.publicGuid!, submissionId, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => this.onSubmitSuccess(result),
        error: (err) => this.onSubmitError(err),
      });
  }

  private onSubmitSuccess(result: any): void {
    this.submitting = false;
    this.submitted = true;
    this.clearDraft();
    if (result?.message) {
      this.confirmationText = result.message;
    }
  }

  private onSubmitError(err: any): void {
    this.submitting = false;
    const msg = err?.error?.message || 'Fehler beim Absenden';
    this.notify.error(msg);
  }
}
