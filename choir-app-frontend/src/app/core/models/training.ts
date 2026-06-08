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

// === MUSIC THEORY ===
export type TheoryCategory =
  | 'grundlagen'
  | 'tonhoehen_rhythmen'
  | 'tonleitern_intervalle'
  | 'harmonien_akkorde'
  | 'anhang';

export interface TheoryTopicSummary {
  id: string;
  key: string;
  category: TheoryCategory;
  title: string;
  summary: string | null;
  orderIndex: number;
}

export interface TheoryTopic extends TheoryTopicSummary {
  content: string; // Markdown
  relatedExercises?: { module: TrainingModule; difficulty?: ExerciseDifficulty }[] | null;
}

export const THEORY_CATEGORY_LABELS: Record<TheoryCategory, string> = {
  grundlagen: 'Grundelemente der Notenschrift',
  tonhoehen_rhythmen: 'Tonhöhen & Rhythmen',
  tonleitern_intervalle: 'Tonleitern & Intervalle',
  harmonien_akkorde: 'Harmonien & Akkorde',
  anhang: 'Anhang & Übersichten'
};

export const THEORY_CATEGORY_ORDER: TheoryCategory[] = [
  'grundlagen', 'tonhoehen_rhythmen', 'tonleitern_intervalle', 'harmonien_akkorde', 'anhang'
];

// --- Weekly leaderboard ---

export interface LeaderboardTimeEntry {
  rank: number;
  firstName: string;
  durationSeconds: number;
}

export interface LeaderboardXpEntry {
  rank: number;
  firstName: string;
  xp: number;
}

export interface WeeklyLeaderboard {
  weekStart: string;
  weekEnd: string;
  byTime: LeaderboardTimeEntry[];
  byXp: LeaderboardXpEntry[];
}
