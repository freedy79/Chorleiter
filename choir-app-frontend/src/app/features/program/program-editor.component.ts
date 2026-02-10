import { Component, OnInit } from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MaterialModule } from '@modules/material.module';
import { ProgramService } from '@core/services/program.service';
import { ProgramItem, Program } from '@core/models/program';
import { ProgramBasicsDialogComponent } from './program-basics-dialog.component';
import { ProgramPieceDialogComponent } from './program-piece-dialog.component';
import { ProgramSpeechDialogComponent } from './program-speech-dialog.component';
import { ProgramBreakDialogComponent } from './program-break-dialog.component';
import { ProgramFreePieceDialogComponent } from './program-free-piece-dialog.component';
import { PieceService } from '@core/services/piece.service';
import { ApiHelperService } from '@core/services/api-helper.service';
import { DialogHelperService } from '@core/services/dialog-helper.service';
import { AddItemTypeDialogComponent } from './add-item-type-dialog.component';
import { FabComponent, FabAction } from '@shared/components/fab/fab.component';
import { DurationPipe } from '@shared/pipes/duration.pipe';
import { ComposerYearsPipe } from '@shared/pipes/composer-years.pipe';

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
  isPublished = false;
  isDraft = false;
  isEditing = false;
  composerCache = new Map<string, any>();

  displayedColumns: string[] = ['move', 'details', 'time', 'actions', 'note'];

  // Mobile selection
  selectedItemId: string | null = null;

  // Pipes for formatting
  private durationPipe = new DurationPipe();
  private composerYearsPipe = new ComposerYearsPipe();

  constructor(
    private programService: ProgramService,
    private route: ActivatedRoute,
    private pieceService: PieceService,
    private apiHelper: ApiHelperService,
    private dialogHelper: DialogHelperService
  ) {}

  ngOnInit(): void {
    this.programId = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.programId) {
      this.loadProgram();
    }
  }

  private loadProgram(): void {
    this.programService.getProgram(this.programId).subscribe(program => {
      this.isPublished = program.status === 'published';
      this.isDraft = program.status === 'draft';
      this.isEditing = this.isDraft;
      this.programTitle = program.title;
      this.programDescription = program.description ?? '';
      this.startTime = program.startTime ?? null;
      this.items = program.items.map(i => this.enhanceItem(i));
    });
  }

  startEditing(): void {
    if (!this.isPublished || this.isDraft) return;

    this.apiHelper.handleApiCall(
      this.programService.startEditing(this.programId),
      {
        successMessage: 'Bearbeitung gestartet',
        errorMessage: 'Fehler beim Starten der Bearbeitung',
        onSuccess: (draftProgram) => {
          this.programId = draftProgram.id;
          this.isDraft = true;
          this.isEditing = true;
          this.loadProgram();
        }
      }
    ).subscribe();
  }

  publishDraft(): void {
    if (!this.isDraft) return;

    this.apiHelper.handleApiCall(
      this.programService.publishProgram(this.programId),
      {
        successMessage: 'Programm veröffentlicht',
        errorMessage: 'Fehler beim Veröffentlichen',
        onSuccess: (publishedProgram) => {
          this.programId = publishedProgram.id;
          this.isPublished = true;
          this.isDraft = false;
          this.isEditing = false;
          this.loadProgram();
        }
      }
    ).subscribe();
  }


  addPiece() {
    this.dialogHelper.openDialogWithApi<
      ProgramPieceDialogComponent,
      { pieceId: string; title: string; composer?: string; durationSec?: number; note?: string; slotId?: string },
      ProgramItem
    >(
      ProgramPieceDialogComponent,
      (result) => this.programService.addPieceItem(this.programId, result),
      {
        dialogConfig: { width: '600px' },
        apiConfig: {
          silent: true,
          onSuccess: (item) => {
            this.updateProgramId(item.programId);
            this.items = [...this.items, this.enhanceItem(item)];
          }
        }
      }
    ).subscribe();
  }

  addFreePiece() {
    this.dialogHelper.openDialogWithApi<
      ProgramFreePieceDialogComponent,
      { title: string; composer?: string; instrument?: string; performerNames?: string; durationSec?: number; note?: string; slotId?: string },
      ProgramItem
    >(
      ProgramFreePieceDialogComponent,
      (result) => this.programService.addFreePieceItem(this.programId, result),
      {
        dialogConfig: { width: '600px' },
        apiConfig: {
          silent: true,
          onSuccess: (item) => {
            this.updateProgramId(item.programId);
            this.items = [...this.items, this.enhanceItem(item)];
          }
        }
      }
    ).subscribe();
  }

  addSpeech() {
    this.dialogHelper.openDialogWithApi<
      ProgramSpeechDialogComponent,
      { title: string; source?: string; speaker?: string; text?: string; durationSec?: number; note?: string; slotId?: string },
      ProgramItem
    >(
      ProgramSpeechDialogComponent,
      (result) => this.programService.addSpeechItem(this.programId, result),
      {
        dialogConfig: { width: '600px' },
        apiConfig: {
          silent: true,
          onSuccess: (item) => {
            this.updateProgramId(item.programId);
            this.items = [...this.items, this.enhanceItem(item)];
          }
        }
      }
    ).subscribe();
  }

  addBreak() {
    this.dialogHelper.openDialogWithApi<
      ProgramBreakDialogComponent,
      { durationSec: number; note?: string; slotId?: string },
      ProgramItem
    >(
      ProgramBreakDialogComponent,
      (result) => this.programService.addBreakItem(this.programId, result),
      {
        dialogConfig: { width: '400px' },
        apiConfig: {
          silent: true,
          onSuccess: (item) => {
            this.updateProgramId(item.programId);
            this.items = [...this.items, this.enhanceItem(item)];
          }
        }
      }
    ).subscribe();
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
    this.dialogHelper.openDialogWithApi<
      ProgramPieceDialogComponent,
      { pieceId: string; title: string; composer?: string; durationSec?: number; note?: string; slotId?: string },
      ProgramItem
    >(
      ProgramPieceDialogComponent,
      (result) => this.programService.addPieceItem(this.programId, { ...result, slotId: item.id }),
      {
        dialogConfig: {
          width: '600px',
          data: { title: item.pieceTitleSnapshot, composer: item.pieceComposerSnapshot }
        },
        apiConfig: {
          successMessage: 'Stück aktualisiert',
          successDuration: 2000,
          onSuccess: (updated) => {
            this.updateProgramId(updated.programId);
            const enh = this.enhanceItem(updated);
            this.items = this.items.map(i => (i.id === item.id ? enh : i));
          }
        }
      }
    ).subscribe();
  }

  private editFreePiece(item: ProgramItem) {
    this.dialogHelper.openDialogWithApi<
      ProgramFreePieceDialogComponent,
      { title: string; composer?: string; instrument?: string; performerNames?: string; durationSec?: number; note?: string; slotId?: string },
      ProgramItem
    >(
      ProgramFreePieceDialogComponent,
      (result) => this.programService.addFreePieceItem(this.programId, { ...result, slotId: item.id }),
      {
        dialogConfig: {
          width: '600px',
          data: {
            title: item.pieceTitleSnapshot,
            composer: item.pieceComposerSnapshot,
            instrument: item.instrument,
            performerNames: item.performerNames,
            duration: item.durationStr,
          }
        },
        apiConfig: {
          successMessage: 'Freies Stück aktualisiert',
          successDuration: 2000,
          errorMessage: 'Fehler beim Bearbeiten des freien Stücks',
          onSuccess: (updated) => {
            this.updateProgramId(updated.programId);
            const enh = this.enhanceItem(updated);
            this.items = this.items.map(i => (i.id === item.id ? enh : i));
          }
        }
      }
    ).subscribe();
  }

  private editSpeech(item: ProgramItem) {
    this.dialogHelper.openDialogWithApi<
      ProgramSpeechDialogComponent,
      { title: string; source?: string; speaker?: string; text?: string; durationSec?: number; note?: string; slotId?: string },
      ProgramItem
    >(
      ProgramSpeechDialogComponent,
      (result) => this.programService.addSpeechItem(this.programId, { ...result, slotId: item.id }),
      {
        dialogConfig: {
          width: '600px',
          data: {
            title: item.speechTitle,
            source: item.speechSource,
            speaker: item.speechSpeaker,
            text: item.speechText,
            duration: item.durationStr,
          }
        },
        apiConfig: {
          successMessage: 'Sprachbeitrag aktualisiert',
          successDuration: 2000,
          errorMessage: 'Fehler beim Bearbeiten des Sprachbeitrags',
          onSuccess: (updated) => {
            this.updateProgramId(updated.programId);
            const enh = this.enhanceItem(updated);
            this.items = this.items.map(i => (i.id === item.id ? enh : i));
          }
        }
      }
    ).subscribe();
  }

  private editBreak(item: ProgramItem) {
    this.dialogHelper.openDialogWithApi<
      ProgramBreakDialogComponent,
      { durationSec: number; note?: string; slotId?: string },
      ProgramItem
    >(
      ProgramBreakDialogComponent,
      (result) => this.programService.addBreakItem(this.programId, { ...result, slotId: item.id }),
      {
        dialogConfig: {
          width: '400px',
          data: { duration: item.durationStr, note: item.note ?? '' }
        },
        apiConfig: {
          successMessage: 'Pause aktualisiert',
          successDuration: 2000,
          errorMessage: 'Fehler beim Bearbeiten der Pause',
          onSuccess: (updated) => {
            this.updateProgramId(updated.programId);
            const enh = this.enhanceItem(updated);
            this.items = this.items.map(i => (i.id === item.id ? enh : i));
          }
        }
      }
    ).subscribe();
  }

  editBasics() {
    this.dialogHelper.openDialogWithApi<
      ProgramBasicsDialogComponent,
      { title?: string; description?: string; startTime?: string | null },
      Program
    >(
      ProgramBasicsDialogComponent,
      (result) => this.programService.updateProgram(this.programId, result),
      {
        dialogConfig: {
          width: '600px',
          data: {
            title: this.programTitle,
            description: this.programDescription,
            startTime: this.startTime,
          }
        },
        apiConfig: {
          silent: true,
          onSuccess: (updated) => {
            this.updateProgramId(updated.id);
            this.programTitle = updated.title;
            this.programDescription = updated.description ?? '';
            this.startTime = updated.startTime ?? null;
          }
        }
      }
    ).subscribe();
  }


  fillSlotWithPiece(item: ProgramItem) {
    this.dialogHelper.openDialogWithApi<
      ProgramPieceDialogComponent,
      { pieceId: string; title: string; composer?: string; durationSec?: number; note?: string; slotId?: string },
      ProgramItem
    >(
      ProgramPieceDialogComponent,
      (result) => this.programService.addPieceItem(this.programId, { ...result, slotId: item.id }),
      {
        dialogConfig: { width: '600px' },
        apiConfig: {
          silent: true,
          errorMessage: 'Fehler beim Hinzufügen des Stücks',
          onSuccess: (updated) => {
            this.updateProgramId(updated.programId);
            const enh = this.enhanceItem(updated);
            this.items = this.items.map(i => (i.id === item.id ? enh : i));
          }
        }
      }
    ).subscribe();
  }

  fillSlotWithFreePiece(item: ProgramItem) {
    this.dialogHelper.openDialogWithApi<
      ProgramFreePieceDialogComponent,
      { title: string; composer?: string; instrument?: string; performerNames?: string; durationSec?: number; note?: string; slotId?: string },
      ProgramItem
    >(
      ProgramFreePieceDialogComponent,
      (result) => this.programService.addFreePieceItem(this.programId, { ...result, slotId: item.id }),
      {
        dialogConfig: { width: '600px' },
        apiConfig: {
          silent: true,
          errorMessage: 'Fehler beim Hinzufügen des freien Stücks',
          onSuccess: (updated) => {
            this.updateProgramId(updated.programId);
            const enh = this.enhanceItem(updated);
            this.items = this.items.map(i => (i.id === item.id ? enh : i));
          }
        }
      }
    ).subscribe();
  }

  fillSlotWithSpeech(item: ProgramItem) {
    this.dialogHelper.openDialogWithApi<
      ProgramSpeechDialogComponent,
      { title: string; source?: string; speaker?: string; text?: string; durationSec?: number; note?: string; slotId?: string },
      ProgramItem
    >(
      ProgramSpeechDialogComponent,
      (result) => this.programService.addSpeechItem(this.programId, { ...result, slotId: item.id }),
      {
        dialogConfig: { width: '600px' },
        apiConfig: {
          silent: true,
          errorMessage: 'Fehler beim Hinzufügen der Rede',
          onSuccess: (updated) => {
            this.updateProgramId(updated.programId);
            const enh = this.enhanceItem(updated);
            this.items = this.items.map(i => (i.id === item.id ? enh : i));
          }
        }
      }
    ).subscribe();
  }

  fillSlotWithBreak(item: ProgramItem) {
    this.dialogHelper.openDialogWithApi<
      ProgramBreakDialogComponent,
      { durationSec: number; note?: string; slotId?: string },
      ProgramItem
    >(
      ProgramBreakDialogComponent,
      (result) => this.programService.addBreakItem(this.programId, { ...result, slotId: item.id }),
      {
        dialogConfig: { width: '400px' },
        apiConfig: {
          silent: true,
          errorMessage: 'Fehler beim Hinzufügen der Pause',
          onSuccess: (updated) => {
            this.updateProgramId(updated.programId);
            const enh = this.enhanceItem(updated);
            this.items = this.items.map(i => (i.id === item.id ? enh : i));
          }
        }
      }
    ).subscribe();
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
    const originalOrder = [...this.items];
    this.apiHelper.handleApiCall(
      this.programService.reorderItems(this.programId, this.items.map(i => i.id)),
      {
        successMessage: 'Reihenfolge gespeichert',
        successDuration: 2000,
        onSuccess: (items: ProgramItem[]) => {
          if (items.length) {
            this.updateProgramId(items[0].programId);
          }
          this.items = items.map(item => this.enhanceItem(item));
        },
        onError: () => {
          // Rollback on error
          this.items = originalOrder;
        }
      }
    ).subscribe();
  }

  hasMissingDurations(): boolean {
    return this.items.some(i => typeof i.durationSec !== 'number');
  }

  getPlannedTime(index: number): string {
    if (!this.startTime) return '';
    const start = this.parseLocalDateTime(this.startTime);
    // Include all items up to AND including the current item
    const offset = this.items
      .slice(0, index + 1)
      .reduce((sum, item) => sum + (item.durationSec || 0), 0);
    const time = new Date(start.getTime() + offset * 1000);
    return this.formatClockTime(time);

  }

  hasNoteRow = (_index: number, row: ProgramItem): boolean => !!row.note;

  toggleSelectItem(itemId: string): void {
    this.selectedItemId = this.selectedItemId === itemId ? null : itemId;
  }

  getSelectedItem(): ProgramItem | undefined {
    return this.items.find(i => i.id === this.selectedItemId);
  }

  openAddItemMenu(): void {
    this.dialogHelper.openDialog<AddItemTypeDialogComponent, string>(
      AddItemTypeDialogComponent,
      { width: '300px', maxWidth: '90vw' }
    ).subscribe((type) => {
      if (!type) return;
      switch (type) {
        case 'piece':
          this.addPiece();
          break;
        case 'freePiece':
          this.addFreePiece();
          break;
        case 'speech':
          this.addSpeech();
          break;
        case 'break':
          this.addBreak();
          break;
      }
    });
  }

  getTotalDuration(): string {
    const total = this.items.reduce((sum, item) => sum + (item.durationSec || 0), 0);
    return this.durationPipe.transform(total);
  }

  getFormattedStartTime(): string {
    if (!this.startTime) return '-';
    const date = this.parseLocalDateTime(this.startTime);
    const dateStr = date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = this.formatClockTime(date);
    return `${dateStr}, ${timeStr}`;
  }

  onDurationChange(item: ProgramItem) {
    const parsedDuration = this.parseDuration(item.durationStr);
    // Only save if the input is empty or a valid duration
    if (item.durationStr === '' || parsedDuration !== null) {
      const previousDuration = item.durationSec;
      item.durationSec = parsedDuration;

      const shouldOfferSave =
        item.type === 'piece' &&
        !!item.pieceId &&
        !item.pieceDurationSecSnapshot &&
        typeof item.durationSec === 'number';

      this.apiHelper.handleApiCall(
        this.programService.updateItem(this.programId, item.id, { durationSec: item.durationSec ?? null }),
        {
          successMessage: 'Dauer gespeichert',
          successDuration: 1500,
          onSuccess: (updated) => {
            this.updateProgramId(updated.programId);
            Object.assign(item, this.enhanceItem(updated));

            if (shouldOfferSave && item.durationSec) {
              this.dialogHelper.confirm({
                title: 'Dauer speichern?',
                message: 'Die eingegebene Dauer ist beim Stück noch nicht hinterlegt. Soll sie dort gespeichert werden?',
                confirmButtonText: 'Ja',
                cancelButtonText: 'Nein'
              }).subscribe(confirmed => {
                if (confirmed) {
                  this.apiHelper.handleApiCall(
                    this.pieceService.updateGlobalPiece(Number(item.pieceId), { durationSec: item.durationSec }),
                    {
                      successMessage: 'Dauer beim Stück gespeichert',
                      successDuration: 2000,
                      onSuccess: () => {
                        item.pieceDurationSecSnapshot = item.durationSec ?? null;
                      }
                    }
                  ).subscribe();
                }
              });
            }
          },
          onError: () => {
            // Rollback on error
            item.durationSec = previousDuration;
            item.durationStr = this.formatDurationInput(previousDuration);
          }
        }
      ).subscribe();
    }
  }

  onNoteChange(item: ProgramItem) {
    this.apiHelper.handleApiCall(
      this.programService.updateItem(this.programId, item.id, { note: item.note ?? null }),
      {
        onSuccess: (updated) => {
          this.updateProgramId(updated.programId);
          Object.assign(item, this.enhanceItem(updated));
        }
      }
    ).subscribe();
  }

  deleteItem(item: ProgramItem) {
    this.apiHelper.handleApiCall(
      this.programService.deleteItem(this.programId, item.id),
      {
        onSuccess: () => {
          this.items = this.items.filter(i => i.id !== item.id);
        }
      }
    ).subscribe();
  }

  downloadPdf() {
    this.apiHelper.handleApiCall(
      this.programService.downloadProgramPdf(this.programId),
      {
        onSuccess: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `programm-${this.programId}.pdf`;
          a.click();
          window.URL.revokeObjectURL(url);
        }
      }
    ).subscribe();
  }

  private updateProgramId(id: string | undefined) {
    // With the new draft-based system, we no longer update the programId
    // as the backend now handles draft creation transparently via getForEditing
    // and all operations stay on the same program ID
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

  getComposerYears(item: ProgramItem): string {
    if (item.type === 'piece' && item.pieceId && this.composerCache.has(item.pieceId)) {
      const composer = this.composerCache.get(item.pieceId);
      return this.composerYearsPipe.transform(composer);
    }
    return '';
  }

  loadComposerData(item: ProgramItem): void {
    if (item.type === 'piece' && item.pieceId && !this.composerCache.has(item.pieceId)) {
      this.pieceService.getPieceById(Number(item.pieceId)).subscribe({
        next: (piece: any) => {
          if (piece.composer && item.pieceId) {
            this.composerCache.set(item.pieceId, piece.composer);
          }
        },
        error: () => {
          // Silently fail - years just won't be shown
        }
      });
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
    // Load composer data if it's a piece
    this.loadComposerData(item);
    return {
      ...item,
      durationStr: this.formatDurationInput(item.durationSec),
    };
  }

  private formatDurationInput(seconds?: number | null): string {
    return typeof seconds === 'number' ? this.durationPipe.transform(seconds) : '';
  }

  private parseDuration(value: string | undefined): number | null {
    if (!value) return null;
    const match = value.match(/^\d{1,2}:\d{2}$/);
    if (!match) return null;
    const [m, s] = value.split(':').map(v => parseInt(v, 10));
    return m * 60 + s;
  }

  private formatClockTime(date: Date): string {
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  private parseLocalDateTime(dateTimeStr: string): Date {
    // If the string has a timezone indicator, parse as ISO string
    if (dateTimeStr.includes('Z') || dateTimeStr.match(/[+-]\d{2}:\d{2}$/)) {
      return new Date(dateTimeStr);
    }

    // Otherwise, treat as local datetime-local format (YYYY-MM-DDTHH:MM or YYYY-MM-DDTHH:MM:SS)
    // We need to ensure it's parsed as local time, not UTC
    const parts = dateTimeStr.split('T');
    if (parts.length !== 2) return new Date(dateTimeStr);

    const [datePart, timePart] = parts;
    const [year, month, day] = datePart.split('-').map(Number);
    const timeComponents = timePart.split(':').map(Number);
    const [hours, minutes, seconds = 0] = timeComponents;

    return new Date(year, month - 1, day, hours, minutes, seconds);
  }
}
