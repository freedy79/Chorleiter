import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MatDialogContent } from '@angular/material/dialog';
import { MatStepperModule, MatStepper } from '@angular/material/stepper';
import { MaterialModule } from '@modules/material.module';

@Component({
  selector: 'app-help-wizard',
  standalone: true,
  imports: [CommonModule, MatStepperModule, MaterialModule],
  templateUrl: './help-wizard.component.html',
  styleUrls: ['./help-wizard.component.scss']
})
export class HelpWizardComponent {
  @ViewChild('content', { read: MatDialogContent }) content!: MatDialogContent;
  @ViewChild('stepper') stepper!: MatStepper;
  constructor(public dialogRef: MatDialogRef<HelpWizardComponent>) {}

  close(): void {
    this.dialogRef.close();
  }
}
