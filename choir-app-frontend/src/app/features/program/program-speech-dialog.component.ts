import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';

@Component({
  selector: 'app-program-speech-dialog',
  standalone: true,
  imports: [CommonModule, MaterialModule, FormsModule, ReactiveFormsModule],
  templateUrl: './program-speech-dialog.component.html',
  styleUrls: ['./program-speech-dialog.component.scss'],
})
export class ProgramSpeechDialogComponent {
  form: FormGroup;

  constructor(private fb: FormBuilder, private dialogRef: MatDialogRef<ProgramSpeechDialogComponent>) {
    this.form = this.fb.group({
      title: ['', Validators.required],
      source: [''],
      speaker: [''],
      text: [''],
      duration: ['', Validators.pattern(/^\d{1,2}:\d{2}$/)],
    });
  }

  save() {
    if (this.form.valid) {
      const { duration, ...rest } = this.form.value;
      let durationSec: number | undefined;
      if (duration) {
        const [m, s] = duration.split(':').map((v: string) => parseInt(v, 10));
        durationSec = m * 60 + s;
      }
      this.dialogRef.close({ ...rest, durationSec });
    }
  }

  cancel() {
    this.dialogRef.close();
  }
}
