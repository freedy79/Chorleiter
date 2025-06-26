import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './privacy.component.html',
  styleUrls: ['./privacy.component.scss'] // Wir verwenden ein geteiltes SCSS
})
export class PrivacyComponent {}
