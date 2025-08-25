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
  items: ProgramItem[] = [];
  displayedColumns = ['move', 'title', 'composer', 'duration', 'note', 'sum', 'actions'];

  constructor(private dialog: MatDialog, private programService: ProgramService) {}

  addPiece() {
    const dialogRef = this.dialog.open(ProgramPieceDialogComponent, {
      width: '600px',
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.programService.addPieceItem(this.programId, result).subscribe(item => {
          this.items = [...this.items, item];
        });
      }
    });
  }


  addSpeech() {
    const dialogRef = this.dialog.open(ProgramSpeechDialogComponent, {
      width: '600px',
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.programService.addSpeechItem(this.programId, result).subscribe(item => {
           this.items = [...this.items, item];
        }
                                                                            });
   }

  addBreak() {
    const dialogRef = this.dialog.open(ProgramBreakDialogComponent, {
      width: '400px',
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.programService.addBreakItem(this.programId, result).subscribe(item => {
          this.items = [...this.items, item];
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
    this.programService
      .reorderItems(this.programId, this.items.map(i => i.id))
      .subscribe(items => {
        this.items = items;
      });
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
}
