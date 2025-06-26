import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';

@Component({
  selector: 'app-imprint',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './imprint.component.html',
  styleUrls: ['./imprint.component.scss'] // Wir verwenden ein geteiltes SCSS
})
export class ImprintComponent {}
