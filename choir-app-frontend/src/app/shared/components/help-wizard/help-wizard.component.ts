import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef } from '@angular/material/dialog';
import { MatStepperModule } from '@angular/material/stepper';
import { MaterialModule } from '@modules/material.module';

@Component({
  selector: 'app-help-wizard',
  standalone: true,
  imports: [CommonModule, MatStepperModule, MaterialModule],
  templateUrl: './help-wizard.component.html',
  styleUrls: ['./help-wizard.component.scss']
})
export class HelpWizardComponent {
  constructor(public dialogRef: MatDialogRef<HelpWizardComponent>) {}

  close(): void {
    this.dialogRef.close();
  }
}
