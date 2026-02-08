import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from '@modules/material.module';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { RehearsalData, MidiFileInfo } from './models/rehearsal-data.types';

interface MeasureRow {
  key: string;
  tick: number;
}

interface PageRow {
  key: string;
  tick: number;
}

interface VoicingRow {
  voiceName: string;
  trackIndex: number;
}

@Component({
  selector: 'app-rehearsal-data-editor-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule],
  templateUrl: './rehearsal-data-editor-dialog.component.html',
  styleUrls: ['./rehearsal-data-editor-dialog.component.scss']
})
export class RehearsalDataEditorDialogComponent implements OnInit {
  rehearsalData: RehearsalData;
  midiFileInfo: MidiFileInfo | null;

  // Form mode
  ppq: number = 480;
  measureRows: MeasureRow[] = [];
  pageRows: PageRow[] = [];
  voicingRows: VoicingRow[] = [];

  // JSON mode
  jsonText: string = '';
  jsonError: string | null = null;

  // UI state
  editMode: 'form' | 'json' = 'form';

  constructor(
    private dialogRef: MatDialogRef<RehearsalDataEditorDialogComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: { rehearsalData: RehearsalData; midiFileInfo: MidiFileInfo | null }
  ) {
    this.rehearsalData = JSON.parse(JSON.stringify(data.rehearsalData));
    this.midiFileInfo = data.midiFileInfo;
  }

  ngOnInit(): void {
    this.loadFormFromData();
    this.updateJsonText();
  }

  private loadFormFromData(): void {
    this.ppq = this.rehearsalData.ppq;

    this.measureRows = Object.entries(this.rehearsalData.measureToTick)
      .map(([key, tick]) => ({ key, tick }))
      .sort((a, b) => parseInt(a.key) - parseInt(b.key));

    this.pageRows = Object.entries(this.rehearsalData.pageToTick)
      .map(([key, tick]) => ({ key, tick }))
      .sort((a, b) => parseInt(a.key) - parseInt(b.key));

    this.voicingRows = Object.entries(this.rehearsalData.voicing)
      .map(([voiceName, trackIndex]) => ({ voiceName, trackIndex }))
      .sort((a, b) => a.voiceName.localeCompare(b.voiceName));
  }

  private saveFormToData(): void {
    this.rehearsalData.ppq = this.ppq;

    this.rehearsalData.measureToTick = {};
    this.measureRows.forEach(row => {
      if (row.key) {
        this.rehearsalData.measureToTick[row.key] = row.tick;
      }
    });

    this.rehearsalData.pageToTick = {};
    this.pageRows.forEach(row => {
      if (row.key) {
        this.rehearsalData.pageToTick[row.key] = row.tick;
      }
    });

    this.rehearsalData.voicing = {};
    this.voicingRows.forEach(row => {
      if (row.voiceName) {
        this.rehearsalData.voicing[row.voiceName] = row.trackIndex;
      }
    });
  }

  private updateJsonText(): void {
    this.jsonText = JSON.stringify(this.rehearsalData, null, 2);
  }

  onSwitchToJson(): void {
    this.saveFormToData();
    this.updateJsonText();
    this.editMode = 'json';
    this.jsonError = null;
  }

  onSwitchToForm(): void {
    // Try to parse JSON first
    try {
      const parsed = JSON.parse(this.jsonText);
      if (!this.validateRehearsalData(parsed)) {
        this.jsonError = 'Ungültiges JSON-Format';
        return;
      }
      this.rehearsalData = parsed;
      this.loadFormFromData();
      this.editMode = 'form';
      this.jsonError = null;
    } catch (e) {
      this.jsonError = 'JSON Parse-Fehler: ' + e;
    }
  }

  onFormatJson(): void {
    try {
      const parsed = JSON.parse(this.jsonText);
      this.jsonText = JSON.stringify(parsed, null, 2);
      this.jsonError = null;
    } catch (e) {
      this.jsonError = 'JSON Parse-Fehler: ' + e;
    }
  }

  addMeasureRow(): void {
    const nextKey = this.measureRows.length > 0
      ? (Math.max(...this.measureRows.map(r => parseInt(r.key) || 0)) + 1).toString()
      : '1';
    this.measureRows.push({ key: nextKey, tick: 0 });
  }

  removeMeasureRow(index: number): void {
    this.measureRows.splice(index, 1);
  }

  addPageRow(): void {
    const nextKey = this.pageRows.length > 0
      ? (Math.max(...this.pageRows.map(r => parseInt(r.key) || 0)) + 1).toString()
      : '1';
    this.pageRows.push({ key: nextKey, tick: 0 });
  }

  removePageRow(index: number): void {
    this.pageRows.splice(index, 1);
  }

  addVoicingRow(): void {
    this.voicingRows.push({ voiceName: '', trackIndex: 1 });
  }

  removeVoicingRow(index: number): void {
    this.voicingRows.splice(index, 1);
  }

  getTrackOptions(): number[] {
    if (!this.midiFileInfo) return [1, 2, 3, 4, 5, 6, 7, 8];
    return this.midiFileInfo.tracks.map(t => t.index + 1); // 1-based
  }

  getTrackName(trackIndex: number): string {
    if (!this.midiFileInfo) return `Track ${trackIndex}`;
    const track = this.midiFileInfo.tracks.find(t => t.index === trackIndex - 1); // 1-based to 0-based
    return track ? `${track.name} (${track.noteCount} Noten)` : `Track ${trackIndex}`;
  }

  onSave(): void {
    if (this.editMode === 'json') {
      try {
        const parsed = JSON.parse(this.jsonText);
        if (!this.validateRehearsalData(parsed)) {
          this.jsonError = 'Ungültiges JSON-Format';
          return;
        }
        this.rehearsalData = this.normalizeRehearsalData(parsed);
      } catch (e) {
        this.jsonError = 'JSON Parse-Fehler: ' + e;
        return;
      }
    } else {
      this.saveFormToData();
    }

    // Validate
    const validation = this.validateRehearsalData(this.rehearsalData);
    if (!validation) {
      this.jsonError = 'Validierung fehlgeschlagen';
      return;
    }

    this.dialogRef.close(this.rehearsalData);
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }

  private validateRehearsalData(data: any): boolean {
    if (!data || typeof data !== 'object') return false;
    if (typeof data.ppq !== 'number' || data.ppq <= 0) return false;
    if (typeof data.measureToTick !== 'object') return false;
    if (typeof data.pageToTick !== 'object') return false;
    if (typeof data.voicing !== 'object') return false;

    // Validate ticks are integers >= 0
    for (const tick of Object.values(data.measureToTick)) {
      if (typeof tick !== 'number' || tick < 0 || !Number.isInteger(tick)) return false;
    }
    for (const tick of Object.values(data.pageToTick)) {
      if (typeof tick !== 'number' || tick < 0 || !Number.isInteger(tick)) return false;
    }

    // Validate track indices are integers > 0
    for (const trackIndex of Object.values(data.voicing)) {
      if (typeof trackIndex !== 'number' || trackIndex <= 0 || !Number.isInteger(trackIndex)) return false;
    }

    return true;
  }

  private normalizeRehearsalData(data: any): RehearsalData {
    const normalized: RehearsalData = {
      ppq: data.ppq,
      measureToTick: {},
      pageToTick: {},
      voicing: {}
    };

    // Ensure keys are strings
    for (const [key, value] of Object.entries(data.measureToTick)) {
      normalized.measureToTick[key.toString()] = value as number;
    }
    for (const [key, value] of Object.entries(data.pageToTick)) {
      normalized.pageToTick[key.toString()] = value as number;
    }
    for (const [key, value] of Object.entries(data.voicing)) {
      normalized.voicing[key.toString()] = value as number;
    }

    return normalized;
  }

  checkMonotonicWarning(rows: { key: string; tick: number }[]): string | null {
    const sorted = [...rows].sort((a, b) => parseInt(a.key) - parseInt(b.key));
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].tick < sorted[i - 1].tick) {
        return `Warnung: Tick-Werte sind nicht monoton steigend (${sorted[i - 1].key}: ${sorted[i - 1].tick} > ${sorted[i].key}: ${sorted[i].tick})`;
      }
    }
    return null;
  }
}
