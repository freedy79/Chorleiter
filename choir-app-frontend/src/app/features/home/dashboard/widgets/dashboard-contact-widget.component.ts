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
  @Input() contacts: DashboardContact[] | null = [];

  get hasContacts(): boolean {
    return Array.isArray(this.contacts) && this.contacts.length > 0;
  }

  trackById(_: number, contact: DashboardContact): number {
    return contact.id;
  }

  displayName(contact: DashboardContact): string {
    const firstName = contact.firstName ? `${contact.firstName} ` : '';
    return `${firstName}${contact.name}`.trim();
  }
}
