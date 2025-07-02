import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';

@Component({
  selector: 'app-service-unavailable',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './service-unavailable.component.html',
  styleUrls: ['./service-unavailable.component.scss']
})
export class ServiceUnavailableComponent {}
