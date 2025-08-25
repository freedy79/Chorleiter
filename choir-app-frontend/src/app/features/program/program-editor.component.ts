import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { ProgramService } from '@core/services/program.service';
import { ProgramItem } from '@core/models/program';
import { ProgramPieceDialogComponent } from './program-piece-dialog.component';

@Component({
  selector: 'app-program-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule],
  templateUrl: './program-editor.component.html',
  styleUrls: ['./program-editor.component.scss'],
})
export class ProgramEditorComponent {
  programId = '';
  items: ProgramItem[] = [];

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
}
