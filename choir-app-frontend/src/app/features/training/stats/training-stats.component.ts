import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MaterialModule } from '@modules/material.module';
import { TrainingService } from '@core/services/training.service';
import { TrainingStats, MODULE_LABELS, TrainingModule } from '@core/models/training';

@Component({
  selector: 'app-training-stats',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './training-stats.component.html',
  styleUrls: ['./training-stats.component.scss']
})
export class TrainingStatsComponent implements OnInit, OnDestroy {
  stats: TrainingStats | null = null;
  isLoading = true;
  moduleLabels = MODULE_LABELS;
  modules: TrainingModule[] = ['rhythm', 'note_reading', 'ear_training'];

  moduleIcons: Record<TrainingModule, string> = {
    rhythm: 'music_note',
    note_reading: 'library_music',
    ear_training: 'hearing'
  };

  private destroy$ = new Subject<void>();

  constructor(private trainingService: TrainingService) {}

  ngOnInit(): void {
    this.trainingService.getStats().pipe(takeUntil(this.destroy$)).subscribe({
      next: (stats) => {
        this.stats = stats;
        this.isLoading = false;
      },
      error: () => this.isLoading = false
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
