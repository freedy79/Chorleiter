import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, FormControl } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatDialogRef } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { SearchService } from '@core/services/search.service';
import { Composer } from '@core/models/composer';
import { Observable, startWith, map } from 'rxjs';

interface PieceLookup {
  id: string | number;
  title: string;
  composerName?: string;
  durationSec?: number;
}

@Component({
  selector: 'app-program-piece-dialog',
  standalone: true,
  imports: [CommonModule, MaterialModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './program-piece-dialog.component.html',
  styleUrls: ['./program-piece-dialog.component.scss'],
})
export class ProgramPieceDialogComponent implements OnInit {
  searchForm: FormGroup;
  composerCtrl = new FormControl('');
  filteredComposers$!: Observable<Composer[]>;
  allComposers: Composer[] = [];
  repertoireOnly = true;
  pieces: PieceLookup[] = [];

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private search: SearchService,
    private dialogRef: MatDialogRef<ProgramPieceDialogComponent>
  ) {
    this.searchForm = this.fb.group({
      title: [''],
      composer: this.composerCtrl,
      tags: [''],
      hasDuration: [false],
    });
  }

  ngOnInit(): void {
    this.api.getComposers().subscribe(list => {
      this.allComposers = list;
      this.filteredComposers$ = this.composerCtrl.valueChanges.pipe(
        startWith(''),
        map(value => (value || '').toLowerCase()),
        map(name => this.allComposers.filter(c => c.name.toLowerCase().includes(name)))
      );
    });
    this.loadPieces();
  }

  toggleSource() {
    this.repertoireOnly = !this.repertoireOnly;
    this.loadPieces();
  }

  onSearch() {
    this.loadPieces();
  }

  private loadPieces() {
    if (this.repertoireOnly) {
      this.api.getRepertoireForLookup().subscribe(pieces => {
        const mapped: PieceLookup[] = pieces.map(p => ({
          id: p.id,
          title: p.title,
          composerName: p.composerName,
          durationSec: p.durationSec,
        }));
        this.pieces = this.applyFilters(mapped);
      });
    } else {
      const term = this.searchForm.value.title || '';
      this.search.searchAll(term).subscribe(res => {
        const mapped: PieceLookup[] = (res.pieces || []).map(p => ({
          id: p.id,
          title: p.title,
          composerName: p.composer?.name || p.origin || '',
          durationSec: (p as any).durationSec || (p as any).pieceDurationSecSnapshot,
        }));
        this.pieces = this.applyFilters(mapped);
      });
    }
  }

  private applyFilters(pieces: PieceLookup[]): PieceLookup[] {
    const { title, composer, hasDuration } = this.searchForm.value;
    return pieces.filter(p => {
      const titleMatch = title ? p.title.toLowerCase().includes(title.toLowerCase()) : true;
      const compMatch = composer ? (p.composerName || '').toLowerCase().includes(composer.toLowerCase()) : true;
      const durationMatch = hasDuration ? typeof p.durationSec === 'number' : true;
      return titleMatch && compMatch && durationMatch;
    });
  }

  selectPiece(piece: PieceLookup) {
    this.dialogRef.close({
      pieceId: piece.id,
      title: piece.title,
      composer: piece.composerName,
      durationSec: piece.durationSec,
    });
  }

  cancel() {
    this.dialogRef.close();
  }
}
