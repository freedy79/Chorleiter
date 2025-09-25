import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { DashboardContact } from '@core/models/dashboard-contact';

@Component({
  selector: 'app-dashboard-contact-widget',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './dashboard-contact-widget.component.html',
  styleUrls: ['./dashboard-contact-widget.component.scss']
})
export class DashboardContactWidgetComponent {
  @Input() contact: DashboardContact | null = null;

  get hasContact(): boolean {
    return !!this.contact;
  }

  get displayName(): string {
    if (!this.contact) {
      return '';
    }
    const firstName = this.contact.firstName ? `${this.contact.firstName} ` : '';
    return `${firstName}${this.contact.name}`.trim();
  }
}
