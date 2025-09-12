import { ChangeDetectionStrategy, Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-quick-actions-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './quick-actions-widget.component.html',
  styleUrls: ['./quick-actions-widget.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuickActionsWidgetComponent {
  @Output() exportIcs = new EventEmitter<void>();
  @Output() connectGoogle = new EventEmitter<void>();
  @Output() createEvent = new EventEmitter<void>();
}