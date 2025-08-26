import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators, FormControl } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { Composer } from '@core/models/composer';
import { Observable, startWith, map } from 'rxjs';

@Component({
  selector: 'app-program-free-piece-dialog',
  standalone: true,
  imports: [CommonModule, MaterialModule, FormsModule, ReactiveFormsModule],
  templateUrl: './program-free-piece-dialog.component.html',
  styleUrls: ['./program-free-piece-dialog.component.scss'],
})
export class ProgramFreePieceDialogComponent implements OnInit {
  form: FormGroup;
  composerCtrl = new FormControl('');
  filteredComposers$!: Observable<Composer[]>;
  allComposers: Composer[] = [];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ProgramFreePieceDialogComponent>,
    private api: ApiService
  ) {
    this.form = this.fb.group({
      title: ['', Validators.required],
      composer: this.composerCtrl,
      instrument: [''],
      performerNames: [''],
      duration: ['', Validators.pattern(/^\d{1,2}:\d{2}$/)],
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
  }

  save() {
    if (this.form.valid) {
      const { duration, ...rest } = this.form.value;
      let durationSec: number | undefined;
      if (duration) {
        const [m, s] = duration.split(':').map((v: string) => parseInt(v, 10));
        durationSec = m * 60 + s;
      }
      this.dialogRef.close({ ...rest, durationSec });
    }
  }

  cancel() {
    this.dialogRef.close();
  }
}
