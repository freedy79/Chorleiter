import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatDialogRef } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';

interface BuildInfo {
  buildUser: string;
  buildDate: string;
  installUser: string;
  installDate: string;
}

@Component({
  selector: 'app-build-info-dialog',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './build-info-dialog.component.html',
  styleUrls: ['./build-info-dialog.component.scss']
})
export class BuildInfoDialogComponent implements OnInit {
  info: BuildInfo | null = null;

  constructor(private http: HttpClient, private dialogRef: MatDialogRef<BuildInfoDialogComponent>) {}

  ngOnInit(): void {
    this.http.get<BuildInfo>('assets/build-info.json').subscribe(data => this.info = data);
  }

  close(): void {
    this.dialogRef.close();
  }
}
