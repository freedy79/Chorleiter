import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { BaseFormDialog } from '@shared/dialogs/base-form-dialog';

interface SpeechData {
  title?: string;
  source?: string;
  speaker?: string;
  text?: string;
  duration?: string | null;
}

interface SpeechResult {
  title: string;
  source: string;
  speaker: string;
  text: string;
  durationSec?: number;
}

@Component({
  selector: 'app-program-speech-dialog',
  standalone: true,
  imports: [CommonModule, MaterialModule, FormsModule, ReactiveFormsModule],
  templateUrl: './program-speech-dialog.component.html',
  styleUrls: ['./program-speech-dialog.component.scss'],
})
export class ProgramSpeechDialogComponent extends BaseFormDialog<SpeechResult, SpeechData | null> implements OnInit {
  constructor(
    fb: FormBuilder,
    dialogRef: MatDialogRef<ProgramSpeechDialogComponent>,
    @Inject(MAT_DIALOG_DATA) data: SpeechData | null
  ) {
    super(fb, dialogRef, data);
  }

  protected buildForm(): FormGroup {
    return this.fb.group({
      title: [this.data?.title ?? '', Validators.required],
      source: [this.data?.source ?? ''],
      speaker: [this.data?.speaker ?? ''],
      text: [this.data?.text ?? ''],
      duration: [this.data?.duration ?? '', Validators.pattern(/^\d{1,2}:\d{2}$/)],
    });
  }

  protected override getResult(): SpeechResult {
    const { duration, ...rest } = this.form.value;
    let durationSec: number | undefined;

    if (duration) {
      const [m, s] = duration.split(':').map((v: string) => parseInt(v, 10));
      durationSec = m * 60 + s;
    }

    return { ...rest, durationSec };
  }
}
