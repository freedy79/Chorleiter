import { Piece } from './piece';
import { Collection } from './collection';

export interface LibraryItem {
  id: number;
  piece?: Piece;
  collection?: Collection;
  collectionId?: number;
  copies: number;
  status: 'available' | 'borrowed';
  availableAt?: string | null;
}
