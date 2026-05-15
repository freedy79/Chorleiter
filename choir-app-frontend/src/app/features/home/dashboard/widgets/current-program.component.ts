import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Program, ProgramItem } from '@core/models/program';
import { MaterialModule } from '@modules/material.module';
import { RouterModule } from '@angular/router';
import { PieceService } from '@core/services/piece.service';


@Component({
  selector: 'app-current-program-widget',
  standalone: true,
  imports: [CommonModule, MaterialModule, RouterModule],
  templateUrl: './current-program.component.html',
  styleUrls: ['./current-program.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CurrentProgramWidgetComponent implements OnInit {
  @Input({ required: true }) program: Program | null = null;
  composerCache = new Map<string, any>();
  pieceCache = new Map<string, any>();

  constructor(private pieceService: PieceService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    // Load piece data (composer, collections) when program items are available
    if (this.program?.items) {
      this.program.items.forEach(item => this.loadPieceData(item));
    }
  }

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

  getComposerYears(item: ProgramItem): string {
    if (item.type === 'piece' && item.pieceId && this.composerCache.has(item.pieceId)) {
      const composer = this.composerCache.get(item.pieceId);
      return this.formatComposerYears(composer);
    }
    return '';
  }

  loadPieceData(item: ProgramItem): void {
    if (item.type === 'piece' && item.pieceId && !this.pieceCache.has(item.pieceId)) {
      this.pieceService.getPieceById(Number(item.pieceId)).subscribe({
        next: (piece: any) => {
          if (item.pieceId) {
            this.pieceCache.set(item.pieceId, piece);
            if (piece.composer) {
              this.composerCache.set(item.pieceId, piece.composer);
            }
            this.cdr.markForCheck();
          }
        },
        error: () => {
          // Silently fail - extra info just won't be shown
        }
      });
    }
  }

  formatComposerYears(composer: any): string {
    if (!composer || !composer.birthYear) {
      return '';
    }
    if (composer.deathYear) {
      return ` (${composer.birthYear}-${composer.deathYear})`;
    }
    return ` (${composer.birthYear})`;
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

  getCollectionInfo(item: ProgramItem): string | null {
    if (item.type !== 'piece' || !item.pieceId || !this.pieceCache.has(item.pieceId)) {
      return null;
    }
    const piece = this.pieceCache.get(item.pieceId);
    if (!piece?.collections?.length) {
      return null;
    }
    const parts: string[] = [];
    for (const col of piece.collections) {
      if (col.singleEdition) {
        if (col.title) {
          parts.push(col.title);
        }
      } else {
        const num = col.collection_piece?.numberInCollection;
        if (num) {
          parts.push(`${col.prefix} ${num}`);
        }
      }
    }
    return parts.length > 0 ? parts.join(' · ') : null;
  }
}
