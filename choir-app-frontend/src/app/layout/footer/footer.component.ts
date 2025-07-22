import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router'; // Wichtig für routerLink
import { MaterialModule } from '@modules/material.module';
import { buildInfo } from '@env/build-info';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule, MaterialModule],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent {
    public readonly currentYear: number = new Date().getFullYear();
    public readonly buildDate: string = buildInfo.date;
}
