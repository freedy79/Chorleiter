export type ReactionType = 'like' | 'celebrate' | 'support' | 'love' | 'insightful' | 'curious';

export interface ReactionSummary {
  type: ReactionType;
  count: number;
}

export interface ReactionInfo {
  summary: ReactionSummary[];
  total: number;
  userReaction: ReactionType | null;
}
