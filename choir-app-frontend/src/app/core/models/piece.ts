import { Composer } from './composer';
import { Category } from './category';
import { Author } from './author';
import { PieceLink } from './piece-link';

export interface PieceNote {
  id: number;
  text: string;
  createdAt: string;
  updatedAt: string;
  author: { id: number; name: string };
}

export interface CollectionReference {
  prefix: string;
  title?: string;
  singleEdition?: boolean;
  collection_piece: { // The name of the through model in Sequelize
    numberInCollection: string;
  };
}

export interface Piece {
  id: number;
  title: string;
  subtitle?: string;
  composerCollection?: string;
  voicing?: string;
  composer?: Composer;
  category?: Category;
  choir_repertoire?: {
    status: 'CAN_BE_SUNG' | 'IN_REHEARSAL' | 'NOT_READY';
    notes?: string | null;
  };
  collections?: CollectionReference[];
  collectionPrefix?: string | null;
  collectionNumber?: string | null;
  collectionCount?: number;

  key?: string;
  timeSignature?: string;
  lyrics?: string;
  imageIdentifier?: string;
  license?: string;
  opus?: string;
  lyricsSource?: string;
  author?: Author;
  arrangers?: Composer[];
  links?: PieceLink[];
  events?: import('./event').EventPiece[];
  notes?: PieceNote[];
  lastSung?: string | null;
  lastRehearsed?: string | null;
  timesSung?: number;
  timesRehearsed?: number;
}
