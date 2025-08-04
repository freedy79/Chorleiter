export interface PieceStat {
  id: number;
  title: string;
  count: number;
}

export interface StatsSummary {
  topServicePieces: PieceStat[];
  topRehearsalPieces: PieceStat[];
  leastUsedPieces: PieceStat[];
  singableCount: number;
  rehearsalCount: number;
}
