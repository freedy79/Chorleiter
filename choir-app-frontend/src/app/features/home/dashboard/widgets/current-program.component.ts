import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Program, ProgramItem } from '@core/models/program';
import { Piece } from '@core/models/piece';
import { MaterialModule } from '@modules/material.module';
import { RouterModule } from '@angular/router';


@Component({
  selector: 'app-current-program-widget',
  standalone: true,
  imports: [CommonModule, MaterialModule, RouterModule],
  templateUrl: './current-program.component.html',
  styleUrls: ['./current-program.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CurrentProgramWidgetComponent {
  @Input({ required: true }) program: Program | null = null;


  getItemComposer(item: ProgramItem): string | null {
    switch (item.type) {
      case 'piece':
        return item.pieceComposerSnapshot ?? null;
      case 'speech':
        return item.speechSpeaker ?? null;
      default:
        return null;
    }
  }

  getItemTitle(item: ProgramItem): string {
    switch (item.type) {
      case 'piece':
        return item.pieceTitleSnapshot || '';
      case 'speech':
        return item.speechTitle || '';
      case 'break':
        return item.breakTitle || 'Pause';
      case 'slot':
        return item.slotLabel || '';
      default:
        return '';
    }
  }

  getItemSubtitle(item: ProgramItem): string | null {
    switch (item.type) {
      case 'piece':
        return item.instrument || item.performerNames || null;
      case 'speech':
        return item.speechSource || null;
      default:
        return null;
    }
  }
};
