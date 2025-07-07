import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { RouterModule } from '@angular/router';
import { MaterialModule } from '@modules/material.module';
import { EventTypeLabelPipe } from '@shared/pipes/event-type-label.pipe';
import { PieceStatusLabelPipe } from '@shared/pipes/piece-status-label.pipe';
import { ApiService } from '@core/services/api.service';
import { Piece } from '@core/models/piece';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-piece-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MaterialModule,
    RouterModule,
    EventTypeLabelPipe,
    PieceStatusLabelPipe
  ],
  templateUrl: './piece-detail.component.html',
  styleUrls: ['./piece-detail.component.scss']
})
export class PieceDetailComponent implements OnInit {
  piece?: Piece;
  editNotes = '';
  isEditing = false;

  constructor(private route: ActivatedRoute, private apiService: ApiService) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.apiService.getRepertoirePiece(id).subscribe(p => {
      this.piece = p;
      this.editNotes = p.choir_repertoire?.notes || '';
    });
  }

  startEdit(): void {
    this.isEditing = true;
    this.editNotes = this.piece?.choir_repertoire?.notes || '';
  }

  cancelEdit(): void {
    this.isEditing = false;
  }

  saveNotes(): void {
    if (!this.piece) { return; }
    this.apiService.updatePieceNotes(this.piece.id, this.editNotes).subscribe(() => {
      if (!this.piece!.choir_repertoire) {
        this.piece!.choir_repertoire = { status: 'NOT_READY', notes: this.editNotes };
      } else {
        this.piece!.choir_repertoire.notes = this.editNotes;
      }
      this.isEditing = false;
    });
  }
}
