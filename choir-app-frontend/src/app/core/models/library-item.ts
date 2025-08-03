import { Collection } from './collection';

export interface LibraryItem {
  id: number;
  collection?: Collection;
  collectionId?: number;
  copies: number;
  status: 'available' | 'borrowed';
  availableAt?: string | null;
}
