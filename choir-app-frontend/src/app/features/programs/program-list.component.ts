import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { Program } from '@core/models/program';
import { ProgramService } from '@core/services/program.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '@shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-program-list',
  standalone: true,
  imports: [CommonModule, RouterModule, MaterialModule],
  templateUrl: './program-list.component.html',
  styleUrls: ['./program-list.component.scss'],
})
export class ProgramListComponent implements OnInit {
  programs: Program[] = [];

  constructor(
    private programService: ProgramService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.programService.getPrograms().subscribe(programs => (this.programs = programs));
  }

  delete(program: Program): void {
    const message = program.status === 'draft'
      ? 'Möchten Sie diesen Entwurf wirklich löschen? Falls eine Veröffentlichung existiert, wird auch diese gelöscht.'
      : 'Möchten Sie dieses veröffentlichte Programm und alle zugehörigen Entwürfe wirklich löschen?';

    const dialogData: ConfirmDialogData = {
      title: 'Programm löschen',
      message: message,
      confirmButtonText: 'Ja, löschen',
      cancelButtonText: 'Abbrechen',
    };

    const ref = this.dialog.open(ConfirmDialogComponent, { data: dialogData });
    ref.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.programService.deleteProgram(program.id).subscribe(() => {
          this.programs = this.programs.filter(p => p.id !== program.id);
        });
      }
    });
  }

  publish(program: Program): void {
    this.programService.publishProgram(program.id).subscribe(updated => {
      const index = this.programs.findIndex(p => p.id === program.id);
      if (index !== -1) this.programs[index] = updated;
    });
  }

}
