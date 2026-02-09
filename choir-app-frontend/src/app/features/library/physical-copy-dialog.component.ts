import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { PhysicalCopy } from '@core/models/physical-copy';

@Component({
  selector: 'app-physical-copy-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MaterialModule],
  template: `
    <h1 mat-dialog-title>{{ data.copy ? 'Druckexemplar bearbeiten' : 'Druckexemplar hinzufügen' }}</h1>
    <div mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
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
      <button mat-button (click)="cancel()">Abbrechen</button>
      <button mat-raised-button color="primary" (click)="save()" [disabled]="form.invalid">Speichern</button>
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
export class PhysicalCopyDialogComponent {
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<PhysicalCopyDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { copy?: PhysicalCopy }
  ) {
    const c = data.copy;
    this.form = this.fb.group({
      quantity: [c?.quantity || 1, [Validators.required, Validators.min(1)]],
      purchaseDate: [c?.purchaseDate ? new Date(c.purchaseDate) : null],
      vendor: [c?.vendor || ''],
      unitPrice: [c?.unitPrice || null],
      condition: [c?.condition || null],
      notes: [c?.notes || '']
    });
  }

  save(): void {
    if (this.form.valid) {
      const val = this.form.value;
      if (val.purchaseDate instanceof Date) {
        val.purchaseDate = val.purchaseDate.toISOString().split('T')[0];
      }
      this.dialogRef.close(val);
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
