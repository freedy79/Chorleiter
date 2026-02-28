import { User } from './user';

export interface PollVoter {
  id: number;
  name: string;
  firstName?: string | null;
}

export interface PollOption {
  id: number;
  label: string;
  position: number;
  votes: number;
  selected: boolean;
  voters?: PollVoter[];
}

export interface Poll {
  id: number;
  allowMultiple: boolean;
  maxSelections: number;
  closesAt?: string | null;
  isAnonymous: boolean;
  totalVotes: number;
  options: PollOption[];
}

export interface PollReminderMemberStatus {
  userId: number;
  firstName: string;
  name: string;
  email: string;
  voteCount: number;
  hasVoted: boolean;
  status: 'abgegeben' | 'offen';
  lastReminderSentAt?: string | null;
}

export interface PollReminderStatus {
  postId: number;
  pollId: number;
  allowMultiple: boolean;
  maxSelections: number;
  totalSingerCount: number;
  pendingCount: number;
  members: PollReminderMemberStatus[];
}

export interface PollReminderSendResponse {
  sentCount: number;
  pendingCount: number;
  testSent: boolean;
  message?: string;
}

export interface PollReminderConsumeResponse {
  message: string;
  postId: number;
  accessToken: string;
  user: User;
}
