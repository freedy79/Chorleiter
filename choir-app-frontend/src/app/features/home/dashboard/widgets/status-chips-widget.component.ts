import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ChipStatus = 'ok' | 'warn' | 'bad';
export interface StatusChip { label: string; status: ChipStatus; }

@Component({
  selector: 'app-status-chips-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './status-chips-widget.component.html',
  styleUrls: ['./status-chips-widget.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatusChipsWidgetComponent {
  @Input({ required: true }) chips: ReadonlyArray<StatusChip> = [];
}