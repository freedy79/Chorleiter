import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';

@Component({
  selector: 'app-program-create',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule],
  templateUrl: './program-create.component.html',
  styleUrls: ['./program-create.component.scss']
})
export class ProgramCreateComponent {
  title = '';
  description = '';
  startTime: string | null = null;

  constructor(private api: ApiService, private snackBar: MatSnackBar, private router: Router) {}

  create(): void {
    const data: any = { title: this.title };
    if (this.description) data.description = this.description;
    if (this.startTime) data.startTime = this.startTime;

    this.api.createProgram(data).subscribe({
      next: () => {
        this.snackBar.open('Programm erstellt', 'OK', { duration: 3000 });
        this.router.navigate(['/dashboard']);
      },
      error: () => this.snackBar.open('Fehler beim Erstellen', 'Schließen', { duration: 4000 })
    });
  }
}
