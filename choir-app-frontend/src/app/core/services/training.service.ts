import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  TrainingProfile,
  Exercise,
  ExerciseAttempt,
  AttemptResult,
  BadgeDefinition,
  TrainingStats,
  TrainingModule,
  ExerciseDifficulty
} from '../models/training';

@Injectable({ providedIn: 'root' })
export class TrainingService {
  private readonly baseUrl = `${environment.apiUrl}/training`;

  constructor(private http: HttpClient) {}

  getProfile(): Observable<TrainingProfile> {
    return this.http.get<TrainingProfile>(`${this.baseUrl}/profile`);
  }

  updateProfile(updates: Partial<Pick<TrainingProfile, 'activeModules' | 'weeklyGoalMinutes'>>): Observable<TrainingProfile> {
    return this.http.put<TrainingProfile>(`${this.baseUrl}/profile`, updates);
  }

  getExercises(params?: {
    module?: TrainingModule;
    difficulty?: ExerciseDifficulty;
    limit?: number;
    offset?: number;
  }): Observable<{ exercises: Exercise[]; total: number }> {
    let httpParams = new HttpParams();
    if (params?.module) httpParams = httpParams.set('module', params.module);
    if (params?.difficulty) httpParams = httpParams.set('difficulty', params.difficulty);
    if (params?.limit) httpParams = httpParams.set('limit', params.limit.toString());
    if (params?.offset) httpParams = httpParams.set('offset', params.offset.toString());
    return this.http.get<{ exercises: Exercise[]; total: number }>(`${this.baseUrl}/exercises`, { params: httpParams });
  }

  getExercise(id: string): Observable<Exercise> {
    return this.http.get<Exercise>(`${this.baseUrl}/exercises/${id}`);
  }

  submitAttempt(exerciseId: string, data: {
    score: number;
    accuracy?: number;
    duration: number;
    details?: any;
  }): Observable<AttemptResult> {
    return this.http.post<AttemptResult>(`${this.baseUrl}/exercises/${exerciseId}/attempt`, data);
  }

  getHistory(params?: { limit?: number; offset?: number }): Observable<{ attempts: ExerciseAttempt[]; total: number }> {
    let httpParams = new HttpParams();
    if (params?.limit) httpParams = httpParams.set('limit', params.limit.toString());
    if (params?.offset) httpParams = httpParams.set('offset', params.offset.toString());
    return this.http.get<{ attempts: ExerciseAttempt[]; total: number }>(`${this.baseUrl}/history`, { params: httpParams });
  }

  getBadges(): Observable<BadgeDefinition[]> {
    return this.http.get<BadgeDefinition[]>(`${this.baseUrl}/badges`);
  }

  getStats(): Observable<TrainingStats> {
    return this.http.get<TrainingStats>(`${this.baseUrl}/stats`);
  }

  // Admin
  createExercise(exercise: Partial<Exercise>): Observable<Exercise> {
    return this.http.post<Exercise>(`${this.baseUrl}/admin/exercises`, exercise);
  }

  updateExercise(id: string, exercise: Partial<Exercise>): Observable<Exercise> {
    return this.http.put<Exercise>(`${this.baseUrl}/admin/exercises/${id}`, exercise);
  }

  deleteExercise(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/admin/exercises/${id}`);
  }

  reseedExercises(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/admin/reseed`, {});
  }
}
