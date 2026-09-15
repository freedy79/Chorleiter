import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { FormsModule } from '@angular/forms';

export interface TextInputDialogData {
  title: string;
  message?: string;
  label?: string;
  placeholder?: string;
  initialValue?: string;
  maxLength?: number;
  rows?: number;
}

@Component({
  selector: 'app-text-input-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MaterialModule, FormsModule],
  templateUrl: './text-input-dialog.component.html',
  styleUrls: ['./text-input-dialog.component.scss']
})
export class TextInputDialogComponent {
  inputValue: string;

  constructor(
    private dialogRef: MatDialogRef<TextInputDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TextInputDialogData
  ) {
    this.inputValue = data.initialValue || '';
  }

  onConfirm(): void {
    this.dialogRef.close(this.inputValue.trim());
  }

  onCancel(): void {
    this.dialogRef.close(undefined);
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.onConfirm();
    }
  }
}
