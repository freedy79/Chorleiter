import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { buildInfo } from '@env/build-info';

interface BuildInfo {
  version: string;
  commit: string;
  date: string;
}

@Component({
  selector: 'app-build-info-dialog',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './build-info-dialog.component.html',
  styleUrls: ['./build-info-dialog.component.scss']
})
export class BuildInfoDialogComponent {
  info: BuildInfo = buildInfo;

  constructor(private dialogRef: MatDialogRef<BuildInfoDialogComponent>) {}

  close(): void {
    this.dialogRef.close();
  }
}
