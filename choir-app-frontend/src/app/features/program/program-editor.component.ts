import { Component } from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { ProgramService } from '@core/services/program.service';
import { ProgramItem } from '@core/models/program';
import { ProgramPieceDialogComponent } from './program-piece-dialog.component';
import { ProgramSpeechDialogComponent } from './program-speech-dialog.component';
import { ProgramBreakDialogComponent } from './program-break-dialog.component';

@Component({
  selector: 'app-program-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule, RouterModule],
  templateUrl: './program-editor.component.html',
  styleUrls: ['./program-editor.component.scss'],
})
export class ProgramEditorComponent {
  programId = '';
  startTime: string | null = null;
  items: ProgramItem[] = [];

  private readonly baseColumns = ['move', 'title', 'composer', 'duration', 'note', 'sum', 'actions'];
  private readonly columnsWithTime = ['move', 'title', 'composer', 'duration', 'note', 'time', 'sum', 'actions'];

  constructor(private dialog: MatDialog, private programService: ProgramService) {}

  get displayedColumns(): string[] {
    return this.startTime ? this.columnsWithTime : this.baseColumns;
  }

  addPiece() {
    const dialogRef = this.dialog.open(ProgramPieceDialogComponent, { width: '600px' });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.programService.addPieceItem(this.programId, result).subscribe(item => {
          this.items = [...this.items, item];
        });
      }
    });
  }

  addSpeech() {
    const dialogRef = this.dialog.open(ProgramSpeechDialogComponent, { width: '600px' });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.programService.addSpeechItem(this.programId, result).subscribe(item => {
          this.items = [...this.items, item];
        });
      }
    });
  }

  addBreak() {
    const dialogRef = this.dialog.open(ProgramBreakDialogComponent, { width: '400px' });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.programService.addBreakItem(this.programId, result).subscribe(item => {
          this.items = [...this.items, item];
        });
      }
    });
  }


  fillSlotWithPiece(item: ProgramItem) {
    const dialogRef = this.dialog.open(ProgramPieceDialogComponent, { width: '600px' });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.programService
          .addPieceItem(this.programId, { ...result, slotId: item.id })
          .subscribe(updated => {
            this.items = this.items.map(i => (i.id === item.id ? updated : i));
          });
      }
    });
  }

  fillSlotWithSpeech(item: ProgramItem) {
    const dialogRef = this.dialog.open(ProgramSpeechDialogComponent, { width: '600px' });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.programService
          .addSpeechItem(this.programId, { ...result, slotId: item.id })
          .subscribe(updated => {
            this.items = this.items.map(i => (i.id === item.id ? updated : i));
          });
      }
    });
  }

  fillSlotWithBreak(item: ProgramItem) {
    const dialogRef = this.dialog.open(ProgramBreakDialogComponent, { width: '400px' });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.programService
          .addBreakItem(this.programId, { ...result, slotId: item.id })
          .subscribe(updated => {
            this.items = this.items.map(i => (i.id === item.id ? updated : i));
          });
      }
    });
  }


  drop(event: CdkDragDrop<ProgramItem[]>) {
    moveItemInArray(this.items, event.previousIndex, event.currentIndex);
    this.saveOrder();
  }

  moveUp(index: number) {
    if (index === 0) return;
    moveItemInArray(this.items, index, index - 1);
    this.saveOrder();
  }

  moveDown(index: number) {
    if (index === this.items.length - 1) return;
    moveItemInArray(this.items, index, index + 1);
    this.saveOrder();
  }

  saveOrder() {
    this.programService.reorderItems(this.programId, this.items.map(i => i.id)).subscribe(items => {
      this.items = items;
    });
  }

  hasMissingDurations(): boolean {
    return this.items.some(i => typeof i.durationSec !== 'number');
  }

  getPlannedTime(index: number): string {
    if (!this.startTime) return '';
    const start = new Date(this.startTime);
    const offset = this.items
      .slice(0, index)
      .reduce((sum, item) => sum + (item.durationSec || 0), 0);
    const time = new Date(start.getTime() + offset * 1000);
    return this.formatClockTime(time);

  }

  getCumulativeDuration(index: number): string {
    const total = this.items
      .slice(0, index + 1)
      .reduce((sum, item) => sum + (item.durationSec || 0), 0);
    return this.formatDuration(total);
  }

  getTotalDuration(): string {
    const total = this.items.reduce((sum, item) => sum + (item.durationSec || 0), 0);
    return this.formatDuration(total);
  }

  private formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const s = Math.floor(seconds % 60)
      .toString()
      .padStart(2, '0');
    return `${m}:${s}`;
  }

  private formatClockTime(date: Date): string {
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  }
}
