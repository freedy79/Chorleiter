import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';

@Component({
  selector: 'app-program-speech-dialog',
  standalone: true,
  imports: [CommonModule, MaterialModule, FormsModule, ReactiveFormsModule],
  templateUrl: './program-speech-dialog.component.html',
  styleUrls: ['./program-speech-dialog.component.scss'],
})
export class ProgramSpeechDialogComponent implements OnInit {
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ProgramSpeechDialogComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      title?: string;
      source?: string;
      speaker?: string;
      text?: string;
      duration?: string | null;
    } | null
  ) {
    this.form = this.fb.group({
      title: ['', Validators.required],
      source: [''],
      speaker: [''],
      text: [''],
      duration: ['', Validators.pattern(/^\d{1,2}:\d{2}$/)],
    });
  }

  ngOnInit(): void {
    if (this.data) {
      this.form.patchValue({
        title: this.data.title ?? '',
        source: this.data.source ?? '',
        speaker: this.data.speaker ?? '',
        text: this.data.text ?? '',
        duration: this.data.duration ?? '',
      });
    }
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
