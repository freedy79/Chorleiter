import { Component, OnInit } from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { ProgramService } from '@core/services/program.service';
import { ProgramItem } from '@core/models/program';
import { ProgramBasicsDialogComponent } from './program-basics-dialog.component';
import { ProgramPieceDialogComponent } from './program-piece-dialog.component';
import { ProgramSpeechDialogComponent } from './program-speech-dialog.component';
import { ProgramBreakDialogComponent } from './program-break-dialog.component';
import { ProgramFreePieceDialogComponent } from './program-free-piece-dialog.component';
import { PieceService } from '@core/services/piece.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfirmDialogComponent, ConfirmDialogData } from '@shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-program-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule, RouterModule],
  templateUrl: './program-editor.component.html',
  styleUrls: ['./program-editor.component.scss'],
})
export class ProgramEditorComponent implements OnInit {
  programId = '';
  startTime: string | null = null;
  programTitle = '';
  programDescription = '';
  items: ProgramItem[] = [];

  displayedColumns: string[] = ['move', 'details', 'time', 'actions'];

  constructor(
    private dialog: MatDialog,
    private programService: ProgramService,
    private route: ActivatedRoute,
    private pieceService: PieceService,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.programId = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.programId) {
      this.programService.getProgram(this.programId).subscribe(program => {
        this.programTitle = program.title;
        this.programDescription = program.description ?? '';
        this.startTime = program.startTime ?? null;
        this.items = program.items.map(i => this.enhanceItem(i));
      });
    }
  }


  addPiece() {
    const dialogRef = this.dialog.open(ProgramPieceDialogComponent, { width: '600px' });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.programService.addPieceItem(this.programId, result).subscribe(item => {
          this.updateProgramId(item.programId);
          this.items = [...this.items, this.enhanceItem(item)];
        });
      }
    });
  }

  addFreePiece() {
    const dialogRef = this.dialog.open(ProgramFreePieceDialogComponent, { width: '600px' });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.programService.addFreePieceItem(this.programId, result).subscribe(item => {
          this.updateProgramId(item.programId);
          this.items = [...this.items, this.enhanceItem(item)];
        });
      }
    });
  }

  addSpeech() {
    const dialogRef = this.dialog.open(ProgramSpeechDialogComponent, { width: '600px' });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.programService.addSpeechItem(this.programId, result).subscribe(item => {
          this.updateProgramId(item.programId);
          this.items = [...this.items, this.enhanceItem(item)];
        });
      }
    });
  }

  addBreak() {
    const dialogRef = this.dialog.open(ProgramBreakDialogComponent, { width: '400px' });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.programService.addBreakItem(this.programId, result).subscribe(item => {
          this.updateProgramId(item.programId);
          this.items = [...this.items, this.enhanceItem(item)];
        });
      }
    });
  }

  editItem(item: ProgramItem) {
    if (item.type === 'piece') {
      if (item.pieceId) {
        this.editPiece(item);
      } else {
        this.editFreePiece(item);
      }
    } else if (item.type === 'speech') {
      this.editSpeech(item);
    } else if (item.type === 'break') {
      this.editBreak(item);
    }
  }

  private editPiece(item: ProgramItem) {
    const dialogRef = this.dialog.open(ProgramPieceDialogComponent, {
      width: '600px',
      data: { title: item.pieceTitleSnapshot, composer: item.pieceComposerSnapshot },
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.programService
          .addPieceItem(this.programId, { ...result, slotId: item.id })
          .subscribe(updated => {
            this.updateProgramId(updated.programId);
            const enh = this.enhanceItem(updated);
            this.items = this.items.map(i => (i.id === item.id ? enh : i));
          });
      }
    });
  }

  private editFreePiece(item: ProgramItem) {
    const dialogRef = this.dialog.open(ProgramFreePieceDialogComponent, {
      width: '600px',
      data: {
        title: item.pieceTitleSnapshot,
        composer: item.pieceComposerSnapshot,
        instrument: item.instrument,
        performerNames: item.performerNames,
        duration: item.durationStr,
      },
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.programService
          .addFreePieceItem(this.programId, { ...result, slotId: item.id })
          .subscribe(updated => {
            this.updateProgramId(updated.programId);
            const enh = this.enhanceItem(updated);
            this.items = this.items.map(i => (i.id === item.id ? enh : i));
          });
      }
    });
  }

  private editSpeech(item: ProgramItem) {
    const dialogRef = this.dialog.open(ProgramSpeechDialogComponent, {
      width: '600px',
      data: {
        title: item.speechTitle,
        source: item.speechSource,
        speaker: item.speechSpeaker,
        text: item.speechText,
        duration: item.durationStr,
      },
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.programService
          .addSpeechItem(this.programId, { ...result, slotId: item.id })
          .subscribe(updated => {
            this.updateProgramId(updated.programId);
            const enh = this.enhanceItem(updated);
            this.items = this.items.map(i => (i.id === item.id ? enh : i));
          });
      }
    });
  }

  private editBreak(item: ProgramItem) {
    const dialogRef = this.dialog.open(ProgramBreakDialogComponent, {
      width: '400px',
      data: { duration: item.durationStr, note: item.note ?? '' },
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.programService
          .addBreakItem(this.programId, { ...result, slotId: item.id })
          .subscribe(updated => {
            this.updateProgramId(updated.programId);
            const enh = this.enhanceItem(updated);
            this.items = this.items.map(i => (i.id === item.id ? enh : i));
          });
      }
    });
  }

  editBasics() {
    const dialogRef = this.dialog.open(ProgramBasicsDialogComponent, {
      width: '600px',
      data: {
        title: this.programTitle,
        description: this.programDescription,
        startTime: this.startTime,
      },
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.programService.updateProgram(this.programId, result).subscribe(updated => {
          this.updateProgramId(updated.id);
          this.programTitle = updated.title;
          this.programDescription = updated.description ?? '';
          this.startTime = updated.startTime ?? null;
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
            this.updateProgramId(updated.programId);
            const enh = this.enhanceItem(updated);
            this.items = this.items.map(i => (i.id === item.id ? enh : i));
          });
      }
    });
  }

  fillSlotWithFreePiece(item: ProgramItem) {
    const dialogRef = this.dialog.open(ProgramFreePieceDialogComponent, { width: '600px' });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.programService
          .addFreePieceItem(this.programId, { ...result, slotId: item.id })
          .subscribe(updated => {
            this.updateProgramId(updated.programId);
            const enh = this.enhanceItem(updated);
            this.items = this.items.map(i => (i.id === item.id ? enh : i));
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
            this.updateProgramId(updated.programId);
            const enh = this.enhanceItem(updated);
            this.items = this.items.map(i => (i.id === item.id ? enh : i));
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
            this.updateProgramId(updated.programId);
            const enh = this.enhanceItem(updated);
            this.items = this.items.map(i => (i.id === item.id ? enh : i));
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
      if (items.length) {
        this.updateProgramId(items[0].programId);
      }
      this.items = items.map(i => this.enhanceItem(i));
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

  getTotalDuration(): string {
    const total = this.items.reduce((sum, item) => sum + (item.durationSec || 0), 0);
    return this.formatDuration(total);
  }

  onDurationChange(item: ProgramItem) {
    item.durationSec = this.parseDuration(item.durationStr);
    if (item.durationStr === '' || item.durationSec !== null) {
      const shouldOfferSave =
        item.type === 'piece' &&
        !!item.pieceId &&
        !item.pieceDurationSecSnapshot &&
        typeof item.durationSec === 'number';
      this.programService
        .updateItem(this.programId, item.id, { durationSec: item.durationSec ?? null })
        .subscribe(updated => {
          this.updateProgramId(updated.programId);
          Object.assign(item, this.enhanceItem(updated));
          if (shouldOfferSave && item.durationSec) {
            const dialogData: ConfirmDialogData = {
              title: 'Dauer speichern?',
              message:
                'Die eingegebene Dauer ist beim Stück noch nicht hinterlegt. Soll sie dort gespeichert werden?',
              confirmButtonText: 'Ja',
              cancelButtonText: 'Nein',
            };
            const ref = this.dialog.open(ConfirmDialogComponent, { data: dialogData });
            ref.afterClosed().subscribe(confirmed => {
              if (confirmed) {
                this.pieceService
                  .updateGlobalPiece(Number(item.pieceId), { durationSec: item.durationSec })
                  .subscribe(() => {
                    item.pieceDurationSecSnapshot = item.durationSec ?? null;
                    this.snack.open('Dauer beim Stück gespeichert', undefined, { duration: 2000 });
                  });
              }
            });
          }
        });
    }
  }

  onNoteChange(item: ProgramItem) {
    this.programService
      .updateItem(this.programId, item.id, { note: item.note ?? null })
      .subscribe(updated => {
        this.updateProgramId(updated.programId);
        Object.assign(item, this.enhanceItem(updated));
      });
  }

  deleteItem(item: ProgramItem) {
    this.programService.deleteItem(this.programId, item.id).subscribe(() => {
      this.items = this.items.filter(i => i.id !== item.id);
    });
  }

  downloadPdf() {
    this.programService.downloadProgramPdf(this.programId).subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `programm-${this.programId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    });
  }

  private updateProgramId(id: string | undefined) {
    if (id && id !== this.programId) {
      this.programId = id;
    }
  }

  getComposer(item: ProgramItem): string | null {
    switch (item.type) {
      case 'piece':
        return item.pieceComposerSnapshot ?? null;
      case 'speech':
        return item.speechSpeaker ?? null;
      default:
        return null;
    }
  }

  getSubtitle(item: ProgramItem): string | null {
    switch (item.type) {
      case 'piece':
        return item.instrument || item.performerNames || null;
      case 'speech':
        return item.speechSource || null;
      default:
        return null;
    }
  }

  private enhanceItem(item: ProgramItem): ProgramItem {
    return {
      ...item,
      durationStr: this.formatDurationInput(item.durationSec),
    };
  }

  private formatDurationInput(seconds?: number | null): string {
    return typeof seconds === 'number' ? this.formatDuration(seconds) : '';
  }

  private parseDuration(value: string | undefined): number | null {
    if (!value) return null;
    const match = value.match(/^\d{1,2}:\d{2}$/);
    if (!match) return null;
    const [m, s] = value.split(':').map(v => parseInt(v, 10));
    return m * 60 + s;
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
