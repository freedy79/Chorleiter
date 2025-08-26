import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MaterialModule } from '@modules/material.module';
import { Program } from '@core/models/program';
import { ProgramService } from '@core/services/program.service';

@Component({
  selector: 'app-program-list',
  standalone: true,
  imports: [CommonModule, RouterModule, MaterialModule],
  templateUrl: './program-list.component.html',
  styleUrls: ['./program-list.component.scss'],
})
export class ProgramListComponent implements OnInit {
  programs: Program[] = [];

  constructor(private programService: ProgramService) {}

  ngOnInit(): void {
    this.programService.getPrograms().subscribe(programs => (this.programs = programs));
  }
  delete(program: Program): void {
    this.programService.deleteProgram(program.id).subscribe(() => {
      this.programs = this.programs.filter(p => p.id !== program.id);
    });
  }

}

