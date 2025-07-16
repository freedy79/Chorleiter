import { Component, AfterViewInit, ViewChild } from '@angular/core';
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
export class HelpWizardComponent implements AfterViewInit {
  @ViewChild('content', { read: MatDialogContent }) content!: MatDialogContent;
  @ViewChild('stepper') stepper!: MatStepper;
  constructor(public dialogRef: MatDialogRef<HelpWizardComponent>) {}

  ngAfterViewInit(): void {
    this.resetScroll();
  }

  resetScroll(): void {
    (this.content as any)._elementRef.nativeElement.scrollTop = 0;
  }

  close(): void {
    this.dialogRef.close();
  }
}
