import { Collection } from './collection';
import { PhysicalCopy } from './physical-copy';
import { DigitalLicense } from './digital-license';

export interface LibraryItem {
  id: number;
  collection?: Collection;
  collectionId?: number;
  copies: number;
  status: 'available' | 'requested' | 'borrowed' | 'due' | 'partial_return';
  availableAt?: string | null;
  physicalCopies?: PhysicalCopy[];
  digitalLicenses?: DigitalLicense[];
}
