import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { RouterModule } from '@angular/router';
import { MaterialModule } from '@modules/material.module';
import { EventTypeLabelPipe } from '@shared/pipes/event-type-label.pipe';
import { ApiService } from '@core/services/api.service';
import { Piece, PieceNote } from '@core/models/piece';
import { AuthService } from '@core/services/auth.service';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PieceDialogComponent } from '../piece-dialog/piece-dialog.component';

@Component({
  selector: 'app-piece-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MaterialModule,
    RouterModule,
    EventTypeLabelPipe
  ],
  templateUrl: './piece-detail.component.html',
  styleUrls: ['./piece-detail.component.scss']
})
export class PieceDetailComponent implements OnInit {
  piece?: Piece;
  newNoteText = '';
  editState: { [id: number]: string } = {};
  userId: number | null = null;
  isAdmin = false;

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService,
    private auth: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.loadPiece(id);
    this.auth.currentUser$.subscribe(u => this.userId = u?.id || null);
    this.auth.isAdmin$.subscribe(a => this.isAdmin = a);
  }

  private loadPiece(id: number): void {
    this.apiService.getRepertoirePiece(id).subscribe(p => {
      this.piece = p;
    });
  }

  onStatusChange(newStatus: string): void {
    if (!this.piece) return;
    this.apiService.updatePieceStatus(this.piece.id, newStatus).subscribe(() => {
      if (!this.piece) return;
      this.piece.choir_repertoire = this.piece.choir_repertoire || { status: 'CAN_BE_SUNG' };
      this.piece.choir_repertoire.status = newStatus as any;
    });
  }

  canEdit(note: PieceNote): boolean {
    return note.author.id === this.userId || this.isAdmin;
  }

  startEdit(note: PieceNote): void {
    this.editState[note.id] = note.text;
  }

  cancelEdit(id: number): void {
    delete this.editState[id];
  }

  saveEdit(note: PieceNote): void {
    const text = this.editState[note.id];
    this.apiService.updatePieceNote(note.id, text).subscribe(updated => {
      if (this.piece) {
        const idx = this.piece.notes?.findIndex(n => n.id === note.id);
        if (idx != null && idx >= 0 && this.piece.notes) this.piece.notes[idx] = updated as any;
      }
      delete this.editState[note.id];
    });
  }

  deleteNote(note: PieceNote): void {
    if (!this.piece) return;
    this.apiService.deletePieceNote(note.id).subscribe(() => {
      if (this.piece) {
        this.piece.notes = this.piece.notes?.filter(n => n.id !== note.id);
      }
    });
  }

  addNote(): void {
    if (!this.piece || !this.newNoteText) return;
    this.apiService.addPieceNote(this.piece.id, this.newNoteText).subscribe(n => {
      if (!this.piece!.notes) this.piece!.notes = [];
      this.piece!.notes.unshift(n as any);
      this.newNoteText = '';
    });
  }

  openEditPieceDialog(): void {
    if (!this.piece) return;
    const dialogRef = this.dialog.open(PieceDialogComponent, {
      width: '90vw',
      maxWidth: '800px',
      data: { pieceId: this.piece.id }
    });

    dialogRef.afterClosed().subscribe(wasUpdated => {
      if (wasUpdated) {
        this.snackBar.open('Stück aktualisiert.', 'OK', { duration: 3000 });
        this.loadPiece(this.piece!.id);
      }
    });
  }
}
