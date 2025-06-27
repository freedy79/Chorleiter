import { Piece } from './piece';

export interface PieceChange {
  id: number;
  pieceId: number;
  piece?: Piece;
  data: any;
  createdAt?: string;
}
