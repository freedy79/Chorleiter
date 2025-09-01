import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';

@Component({
  selector: 'app-program-break-dialog',
  standalone: true,
  imports: [CommonModule, MaterialModule, ReactiveFormsModule],
  templateUrl: './program-break-dialog.component.html',
  styleUrls: ['./program-break-dialog.component.scss'],
})
export class ProgramBreakDialogComponent implements OnInit {
  breakForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ProgramBreakDialogComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: { duration?: string | null; note?: string | null } | null
  ) {
    this.breakForm = this.fb.group({
      duration: ['', Validators.required],
      note: [''],
    });
  }

  ngOnInit(): void {
    if (this.data) {
      this.breakForm.patchValue({
        duration: this.data.duration ?? '',
        note: this.data.note ?? '',
      });
    }
  }

  save() {
    const { duration, note } = this.breakForm.value;
    const match = /^\d{1,2}:\d{2}$/.test(duration);
    if (!match) {
      return;
    }
    const [m, s] = duration.split(':').map((v: string) => parseInt(v, 10));
    const durationSec = m * 60 + s;
    this.dialogRef.close({ durationSec, note });
  }

  cancel() {
    this.dialogRef.close();
  }
}
