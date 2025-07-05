import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { LoginAttemptsComponent } from '../login-attempts/login-attempts.component';
import { LogViewerComponent } from '../log-viewer/log-viewer.component';

@Component({
  selector: 'app-protocols',
  standalone: true,
  imports: [CommonModule, MaterialModule, LoginAttemptsComponent, LogViewerComponent],
  templateUrl: './protocols.component.html',
  styleUrls: ['./protocols.component.scss']
})
export class ProtocolsComponent {}
