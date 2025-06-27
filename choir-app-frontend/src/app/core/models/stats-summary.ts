export interface PieceStat {
  id: number;
  title: string;
  count: number;
}

export interface StatsSummary {
  topServicePieces: PieceStat[];
  topRehearsalPieces: PieceStat[];
  singableCount: number;
}
