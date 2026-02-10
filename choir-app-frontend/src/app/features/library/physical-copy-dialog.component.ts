import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { PhysicalCopy } from '@core/models/physical-copy';
import { BaseFormDialog } from '@shared/dialogs/base-form-dialog';

@Component({
  selector: 'app-physical-copy-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MaterialModule],
  template: `
    <h1 mat-dialog-title>{{ title }}</h1>
    <div mat-dialog-content>
      <form [formGroup]="form" class="dialog-form" id="physical-copy-form" (ngSubmit)="onSave()">
        <mat-form-field>
          <mat-label>Anzahl</mat-label>
          <input matInput type="number" formControlName="quantity" />
        </mat-form-field>
        <mat-form-field>
          <mat-label>Kaufdatum</mat-label>
          <input matInput [matDatepicker]="picker" formControlName="purchaseDate" />
          <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
          <mat-datepicker #picker></mat-datepicker>
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
          <mat-label>Zustand</mat-label>
          <mat-select formControlName="condition">
            <mat-option [value]="null">–</mat-option>
            <mat-option value="new">Neu</mat-option>
            <mat-option value="good">Gut</mat-option>
            <mat-option value="worn">Abgenutzt</mat-option>
            <mat-option value="damaged">Beschädigt</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Notizen</mat-label>
          <textarea matInput formControlName="notes" rows="2"></textarea>
        </mat-form-field>
      </form>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Abbrechen</button>
      <button mat-raised-button color="primary" type="submit" form="physical-copy-form" [disabled]="form.invalid">Speichern</button>
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
export class PhysicalCopyDialogComponent extends BaseFormDialog<any, { copy?: PhysicalCopy }> implements OnInit {
  title!: string;

  constructor(
    fb: FormBuilder,
    dialogRef: MatDialogRef<PhysicalCopyDialogComponent>,
    @Inject(MAT_DIALOG_DATA) data: { copy?: PhysicalCopy }
  ) {
    super(fb, dialogRef, data);
    this.title = this.getDialogTitle('Druckexemplar hinzufügen', 'Druckexemplar bearbeiten');
  }

  protected override isEditMode(): boolean {
    return !!this.data?.copy;
  }

  protected buildForm(): FormGroup {
    const c = this.data?.copy;
    return this.fb.group({
      quantity: [c?.quantity || 1, [Validators.required, Validators.min(1)]],
      purchaseDate: [c?.purchaseDate ? new Date(c.purchaseDate) : null],
      vendor: [c?.vendor || ''],
      unitPrice: [c?.unitPrice || null],
      condition: [c?.condition || null],
      notes: [c?.notes || '']
    });
  }

  protected override getResult(): any {
    const val = this.form.value;
    if (val.purchaseDate instanceof Date) {
      val.purchaseDate = val.purchaseDate.toISOString().split('T')[0];
    }
    return val;
  }
}
