import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Program } from '@core/models/program';


@Component({
  selector: 'app-current-program-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './current-program.component.html',
  styleUrls: ['./current-program.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CurrentProgramWidgetComponent {
  @Input({ required: true }) program: Program | null = null;
};
