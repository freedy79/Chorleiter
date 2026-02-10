import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { BaseFormDialog } from '@shared/dialogs/base-form-dialog';

interface BreakData {
  duration?: string | null;
  note?: string | null;
}

interface BreakResult {
  durationSec: number;
  note: string;
}

@Component({
  selector: 'app-program-break-dialog',
  standalone: true,
  imports: [CommonModule, MaterialModule, ReactiveFormsModule],
  templateUrl: './program-break-dialog.component.html',
  styleUrls: ['./program-break-dialog.component.scss'],
})
export class ProgramBreakDialogComponent extends BaseFormDialog<BreakResult, BreakData | null> implements OnInit {
  constructor(
    fb: FormBuilder,
    dialogRef: MatDialogRef<ProgramBreakDialogComponent>,
    @Inject(MAT_DIALOG_DATA) data: BreakData | null
  ) {
    super(fb, dialogRef, data);
  }

  protected buildForm(): FormGroup {
    return this.fb.group({
      duration: [this.data?.duration ?? '', Validators.required],
      note: [this.data?.note ?? ''],
    });
  }

  protected override beforeSubmit(): boolean {
    const duration = this.form.value.duration;
    const match = /^\d{1,2}:\d{2}$/.test(duration);
    if (!match) {
      this.form.get('duration')?.setErrors({ pattern: true });
      this.form.markAllAsTouched();
      return false;
    }
    return true;
  }

  protected override getResult(): BreakResult {
    const { duration, note } = this.form.value;
    const [m, s] = duration.split(':').map((v: string) => parseInt(v, 10));
    const durationSec = m * 60 + s;
    return { durationSec, note };
  }
}
