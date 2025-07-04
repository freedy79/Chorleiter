import { Composer } from './composer';
import { Category } from './category';
import { Author } from './author';
import { PieceLink } from './piece-link';
import { Event } from './event';

export interface CollectionReference {
  prefix: string;
  collection_piece: { // The name of the through model in Sequelize
    numberInCollection: string;
  };
}

export interface Piece {
  id: number;
  title: string;
  voicing?: string;
  composer?: Composer;
  category?: Category;
  choir_repertoire?: {
    status: 'CAN_BE_SUNG' | 'IN_REHEARSAL' | 'NOT_READY';
  };
  collections?: CollectionReference[];
  collectionPrefix?: string | null;
  collectionNumber?: string | null;

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
  events?: Event[];
  lastSung?: string | null;
  lastRehearsed?: string | null;
  timesSung?: number;
  timesRehearsed?: number;
}
