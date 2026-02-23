import { Piece } from './piece';

export interface PieceChangeProposer {
  id: number;
  name?: string;
  firstName?: string;
  email?: string;
}

export interface PieceChange {
  id: number;
  pieceId: number;
  piece?: Piece;
  proposer?: PieceChangeProposer;
  data: Record<string, any>;
  resolvedNames?: Record<string, string>;
  createdAt?: string;
}
