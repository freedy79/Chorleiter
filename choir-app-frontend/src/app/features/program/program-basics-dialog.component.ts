import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';

@Component({
  selector: 'app-program-basics-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule],
  templateUrl: './program-basics-dialog.component.html',
  styleUrls: ['./program-basics-dialog.component.scss'],
})
export class ProgramBasicsDialogComponent {
  title = '';
  description = '';
  startTime: string | null = null;

  constructor(
    public dialogRef: MatDialogRef<ProgramBasicsDialogComponent>,
    @Inject(MAT_DIALOG_DATA)
    data: { title: string; description?: string; startTime?: string | null }
  ) {
    this.title = data.title;
    this.description = data.description ?? '';
    this.startTime = data.startTime ?? null;
  }

  save() {
    this.dialogRef.close({
      title: this.title,
      description: this.description,
      startTime: this.startTime,
    });
  }
}

