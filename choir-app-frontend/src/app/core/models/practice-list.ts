import { Piece } from './piece';
import { PieceLink } from './piece-link';

export interface PracticeList {
  id: number;
  userId: number;
  choirId: number;
  title: string;
  description?: string | null;
  targetDate?: string | null;
  itemCount?: number;
  pinnedCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PracticeListItem {
  id: number;
  practiceListId: number;
  pieceId: number;
  pieceLinkId?: number | null;
  orderIndex: number;
  note?: string | null;
  isPinnedOffline: boolean;
  piece?: Pick<Piece, 'id' | 'title' | 'subtitle' | 'durationSec'> & {
    links?: Array<Pick<PieceLink, 'id' | 'description' | 'url' | 'downloadName' | 'type'>>;
  };
  pieceLink?: Pick<PieceLink, 'id' | 'description' | 'url' | 'downloadName' | 'type'>;
  createdAt?: string;
  updatedAt?: string;
}

export interface PracticeListCreatePayload {
  title: string;
  description?: string | null;
  targetDate?: string | null;
}

export interface PracticeListUpdatePayload {
  title?: string;
  description?: string | null;
  targetDate?: string | null;
}

export interface PracticeListItemCreatePayload {
  pieceId: number;
  pieceLinkId?: number | null;
  orderIndex?: number;
  note?: string | null;
  isPinnedOffline?: boolean;
}

export interface PracticeListItemUpdatePayload {
  orderIndex?: number;
  note?: string | null;
  isPinnedOffline?: boolean;
}

export interface PracticeListMembershipEntry {
  listId: number;
  title: string;
  included: boolean;
}

export interface PracticeListMembershipResponse {
  pieceId: number;
  pieceLinkId: number | null;
  listIds: number[];
  memberships: PracticeListMembershipEntry[];
}
