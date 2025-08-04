export interface PieceStat {
  id: number;
  title: string;
  count: number;
}

export interface StatsSummary {
  topServicePieces: PieceStat[];
  topRehearsalPieces: PieceStat[];
  singableCount: number;
  rehearsalCount: number;
  leastUsedPieces: PieceStat[];
  voicingDistribution: { voicing: string; count: number }[];
}
