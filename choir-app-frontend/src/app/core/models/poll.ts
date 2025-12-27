export interface PollOption {
  id: number;
  label: string;
  position: number;
  votes: number;
  selected: boolean;
}

export interface Poll {
  id: number;
  allowMultiple: boolean;
  maxSelections: number;
  closesAt?: string | null;
  totalVotes: number;
  options: PollOption[];
}
