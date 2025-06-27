import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from 'src/app/core/services/api.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-backup',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './backup.component.html',
  styleUrls: ['./backup.component.scss']
})
export class BackupComponent {
  selectedFile: File | null = null;

  constructor(private api: ApiService, private snack: MatSnackBar) {}

  download(): void {
    this.api.downloadBackup().subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'backup.json';
      a.click();
      window.URL.revokeObjectURL(url);
    });
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  restore(): void {
    if (!this.selectedFile) return;
    this.api.restoreBackup(this.selectedFile).subscribe({
      next: () => this.snack.open('Backup eingespielt', 'OK', { duration: 3000 }),
      error: (err) => this.snack.open('Fehler: ' + err.message, 'OK', { duration: 3000 })
    });
  }
}
