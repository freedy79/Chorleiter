import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MaterialModule } from '@modules/material.module';
import { TrainingService } from '@core/services/training.service';
import {
  Exercise,
  TrainingModule,
  ExerciseDifficulty,
  MODULE_LABELS,
  DIFFICULTY_LABELS
} from '@core/models/training';

@Component({
  selector: 'app-exercise-list',
  standalone: true,
  imports: [CommonModule, MaterialModule, RouterModule],
  templateUrl: './exercise-list.component.html',
  styleUrls: ['./exercise-list.component.scss']
})
export class ExerciseListComponent implements OnInit, OnDestroy {
  exercises: Exercise[] = [];
  isLoading = true;
  selectedModule: TrainingModule | '' = '';
  selectedDifficulty: ExerciseDifficulty | '' = '';

  modules: TrainingModule[] = ['rhythm', 'note_reading', 'ear_training'];
  difficulties: ExerciseDifficulty[] = ['beginner', 'intermediate', 'advanced'];
  moduleLabels = MODULE_LABELS;
  difficultyLabels = DIFFICULTY_LABELS;

  moduleIcons: Record<TrainingModule, string> = {
    rhythm: 'music_note',
    note_reading: 'library_music',
    ear_training: 'hearing'
  };

  private destroy$ = new Subject<void>();

  constructor(
    private trainingService: TrainingService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['module'] && this.modules.includes(params['module'])) {
        this.selectedModule = params['module'];
      }
      if (params['difficulty'] && this.difficulties.includes(params['difficulty'])) {
        this.selectedDifficulty = params['difficulty'];
      }
      this.loadExercises();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadExercises(): void {
    this.isLoading = true;
    const params: any = {};
    if (this.selectedModule) params.module = this.selectedModule;
    if (this.selectedDifficulty) params.difficulty = this.selectedDifficulty;

    this.trainingService.getExercises(params).pipe(takeUntil(this.destroy$)).subscribe({
      next: (result) => {
        this.exercises = result.exercises;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  onModuleChange(module: TrainingModule | ''): void {
    this.selectedModule = module;
    this.loadExercises();
  }

  onDifficultyChange(difficulty: ExerciseDifficulty | ''): void {
    this.selectedDifficulty = difficulty;
    this.loadExercises();
  }

  getExerciseTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      tap_rhythm: 'Rhythmus klopfen',
      rhythm_recognition: 'Rhythmus erkennen',
      name_note: 'Noten benennen',
      interval_reading: 'Intervalle lesen',
      interval_hearing: 'Intervalle hören',
      scale_hearing: 'Tonleitern hören',
      key_signature: 'Tonarten erkennen'
    };
    return labels[type] || type;
  }

  get completedCount(): number {
    return this.exercises.filter(e => e.completed).length;
  }

  get completedPercent(): number {
    if (this.exercises.length === 0) return 0;
    return Math.round((this.completedCount / this.exercises.length) * 100);
  }
}
