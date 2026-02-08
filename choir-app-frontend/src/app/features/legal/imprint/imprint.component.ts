import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';

@Component({
  selector: 'app-imprint',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './imprint.component.html',
  styleUrls: ['./imprint.component.scss'],
  host: {
    'style': 'display: flex; flex-direction: column; flex: 1; width: 100%; min-height: 100vh;'
  }
})
export class ImprintComponent {}
