import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface KpiItem { label: string; value: string | number; }

@Component({
  selector: 'app-kpi-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './kpi-widget.component.html',
  styleUrls: ['./kpi-widget.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KpiWidgetComponent {
  @Input({ required: true }) items: ReadonlyArray<KpiItem> = [];
}