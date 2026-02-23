export interface PollVoter {
  id: number;
  name: string;
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
