import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { DigitalLicense } from '@core/models/digital-license';
import { BaseFormDialog } from '@shared/dialogs/base-form-dialog';

@Component({
  selector: 'app-digital-license-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MaterialModule],
  template: `
    <h1 mat-dialog-title>{{ title }}</h1>
    <div mat-dialog-content>
      <form [formGroup]="form" class="dialog-form" id="digital-license-form" (ngSubmit)="onSave()">
        <mat-form-field>
          <mat-label>Lizenznummer</mat-label>
          <input matInput formControlName="licenseNumber" />
        </mat-form-field>
        <mat-form-field>
          <mat-label>Lizenztyp</mat-label>
          <mat-select formControlName="licenseType">
            <mat-option value="print">Druck</mat-option>
            <mat-option value="display">Anzeige</mat-option>
            <mat-option value="stream">Streaming</mat-option>
            <mat-option value="archive">Archiv</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Anzahl Kopien (leer = unbegrenzt)</mat-label>
          <input matInput type="number" formControlName="quantity" />
        </mat-form-field>
        <mat-form-field>
          <mat-label>Kaufdatum</mat-label>
          <input matInput [matDatepicker]="purchasePicker" formControlName="purchaseDate" />
          <mat-datepicker-toggle matSuffix [for]="purchasePicker"></mat-datepicker-toggle>
          <mat-datepicker #purchasePicker></mat-datepicker>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Händler</mat-label>
          <input matInput formControlName="vendor" />
        </mat-form-field>
        <mat-form-field>
          <mat-label>Einzelpreis (€)</mat-label>
          <input matInput type="number" step="0.01" formControlName="unitPrice" />
        </mat-form-field>
        <mat-form-field>
          <mat-label>Gültig ab</mat-label>
          <input matInput [matDatepicker]="fromPicker" formControlName="validFrom" />
          <mat-datepicker-toggle matSuffix [for]="fromPicker"></mat-datepicker-toggle>
          <mat-datepicker #fromPicker></mat-datepicker>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Gültig bis (leer = unbefristet)</mat-label>
          <input matInput [matDatepicker]="untilPicker" formControlName="validUntil" />
          <mat-datepicker-toggle matSuffix [for]="untilPicker"></mat-datepicker-toggle>
          <mat-datepicker #untilPicker></mat-datepicker>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Notizen</mat-label>
          <textarea matInput formControlName="notes" rows="2"></textarea>
        </mat-form-field>
      </form>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Abbrechen</button>
      <button mat-raised-button color="primary" type="submit" form="digital-license-form" [disabled]="form.invalid">Speichern</button>
    </div>
  `,
  styles: [`
    .dialog-form {
      display: flex;
      flex-direction: column;
      min-width: 300px;
    }
  `]
})
export class DigitalLicenseDialogComponent extends BaseFormDialog<any, { license?: DigitalLicense }> implements OnInit {
  title!: string;

  constructor(
    fb: FormBuilder,
    dialogRef: MatDialogRef<DigitalLicenseDialogComponent>,
    @Inject(MAT_DIALOG_DATA) data: { license?: DigitalLicense }
  ) {
    super(fb, dialogRef, data);
    this.title = this.getDialogTitle('Digitale Lizenz hinzufügen', 'Digitale Lizenz bearbeiten');
  }

  protected override isEditMode(): boolean {
    return !!this.data?.license;
  }

  protected buildForm(): FormGroup {
    const l = this.data?.license;
    return this.fb.group({
      licenseNumber: [l?.licenseNumber || '', Validators.required],
      licenseType: [l?.licenseType || 'print', Validators.required],
      quantity: [l?.quantity || null],
      purchaseDate: [l?.purchaseDate ? new Date(l.purchaseDate) : null],
      vendor: [l?.vendor || ''],
      unitPrice: [l?.unitPrice || null],
      validFrom: [l?.validFrom ? new Date(l.validFrom) : null],
      validUntil: [l?.validUntil ? new Date(l.validUntil) : null],
      notes: [l?.notes || '']
    });
  }

  protected override getResult(): any {
    const val = this.form.value;
    // Convert Date objects to ISO date strings
    for (const key of ['purchaseDate', 'validFrom', 'validUntil']) {
      if (val[key] instanceof Date) {
        val[key] = val[key].toISOString().split('T')[0];
      }
    }
    return val;
  }
}
