import { Piece } from './piece';

export interface LibraryItem {
  id: number;
  piece?: Piece;
  copies: number;
  status: 'available' | 'borrowed';
  availableAt?: string | null;
}
