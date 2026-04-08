export interface TrainingProfile {
  id: string;
  userId: number;
  choirId: number;
  activeModules: TrainingModule[];
  totalXp: number;
  currentLevel: number;
  currentStreak: number;
  longestStreak: number;
  lastPracticeDate: string | null;
  weeklyGoalMinutes: number;
  // Computed fields from backend
  weeklyMinutes?: number;
  totalExercises?: number;
  badgeCount?: number;
  nextLevelXp?: number | null;
  xpForCurrentLevel?: number;
}

export type TrainingModule = 'rhythm' | 'note_reading' | 'ear_training';
export type ExerciseDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface Exercise {
  id: string;
  module: TrainingModule;
  difficulty: ExerciseDifficulty;
  type: string;
  title: string;
  description: string;
  content: any;
  xpReward: number;
  orderIndex: number;
  isActive: boolean;
  // User progress (from backend)
  bestScore?: number | null;
  attemptCount?: number;
  totalXpEarned?: number;
  completed?: boolean;
}

export interface ExerciseAttempt {
  id: string;
  userId: number;
  exerciseId: string;
  choirId: number;
  score: number;
  accuracy: number | null;
  duration: number;
  xpEarned: number;
  completedAt: string;
  details: any;
  exercise?: Exercise;
}

export interface AttemptResult {
  attempt: ExerciseAttempt;
  xpEarned: number;
  totalXp: number;
  currentLevel: number;
  leveledUp: boolean;
  currentStreak: number;
  longestStreak: number;
}

export interface BadgeDefinition {
  id: string;
  key: string;
  title: string;
  description: string;
  icon: string;
  category: 'streak' | 'xp' | 'module' | 'community' | 'mission';
  condition: any;
  xpBonus: number;
  orderIndex: number;
  earned: boolean;
  earnedAt: string | null;
}

export interface TrainingStats {
  profile: TrainingProfile;
  moduleStats: Record<TrainingModule, ModuleStats>;
  recentActivity: DayActivity[];
}

export interface ModuleStats {
  attempts: number;
  avgScore: number;
  totalMinutes: number;
}

export interface DayActivity {
  day: string;
  count: number;
  xp: number;
}

export const MODULE_LABELS: Record<TrainingModule, string> = {
  rhythm: 'Rhythmus',
  note_reading: 'Notenlesen',
  ear_training: 'Gehörbildung'
};

export const DIFFICULTY_LABELS: Record<ExerciseDifficulty, string> = {
  beginner: 'Anfänger',
  intermediate: 'Fortgeschritten',
  advanced: 'Experte'
};
