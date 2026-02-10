import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators, FormControl } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { Composer } from '@core/models/composer';
import { Observable, startWith, map } from 'rxjs';
import { BaseFormDialog } from '@shared/dialogs/base-form-dialog';

interface FreePieceData {
  title?: string;
  composer?: string;
  instrument?: string | null;
  performerNames?: string | null;
  duration?: string | null;
}

interface FreePieceResult {
  title: string;
  composer: string;
  instrument: string;
  performerNames: string;
  durationSec?: number;
}

@Component({
  selector: 'app-program-free-piece-dialog',
  standalone: true,
  imports: [CommonModule, MaterialModule, FormsModule, ReactiveFormsModule],
  templateUrl: './program-free-piece-dialog.component.html',
  styleUrls: ['./program-free-piece-dialog.component.scss'],
})
export class ProgramFreePieceDialogComponent extends BaseFormDialog<FreePieceResult, FreePieceData | null> implements OnInit {
  composerCtrl = new FormControl('');
  filteredComposers$!: Observable<Composer[]>;
  allComposers: Composer[] = [];

  constructor(
    fb: FormBuilder,
    dialogRef: MatDialogRef<ProgramFreePieceDialogComponent>,
    @Inject(MAT_DIALOG_DATA) data: FreePieceData | null,
    private api: ApiService
  ) {
    super(fb, dialogRef, data);
  }

  override ngOnInit(): void {
    super.ngOnInit();
   this.api.getComposers().subscribe(list => {
      this.allComposers = list;
      this.filteredComposers$ = this.composerCtrl.valueChanges.pipe(
        startWith(''),
        map(value => (value || '').toLowerCase()),
        map(name => this.allComposers.filter(c => c.name.toLowerCase().includes(name)))
      );
    });

    if (this.data?.composer) {
      this.composerCtrl.setValue(this.data.composer);
    }
  }

  protected buildForm(): FormGroup {
    return this.fb.group({
      title: [this.data?.title ?? '', Validators.required],
      composer: this.composerCtrl,
      instrument: [this.data?.instrument ?? ''],
      performerNames: [this.data?.performerNames ?? ''],
      duration: [this.data?.duration ?? '', Validators.pattern(/^\d{1,2}:\d{2}$/)],
    });
  }

  protected override getResult(): FreePieceResult {
    const { duration, ...rest } = this.form.value;
    let durationSec: number | undefined;

    if (duration) {
      const [m, s] = duration.split(':').map((v: string) => parseInt(v, 10));
      durationSec = m * 60 + s;
    }

    return { ...rest, durationSec };
  }
}
