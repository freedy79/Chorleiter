import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MaterialModule } from '@modules/material.module';

@Component({
  selector: 'app-admin-layout',
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.scss'],
  standalone: true,
  imports: [
    MaterialModule,
    RouterModule
  ]
})
export class AdminLayoutComponent {

}
