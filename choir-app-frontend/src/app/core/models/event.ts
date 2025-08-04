
import { Composer } from './composer';
import { Author } from './author';
import { CollectionReference } from './piece';

export interface EventPiece {
  /** Identifier of the piece */
  id: number;
  /** Title of the piece. */
  title: string;
  /**
   * Composer information. Some endpoints only provide the name while others
   * include the full composer object. Making the "id" optional keeps the type
   * compatible with both variations.
   */
  composer?: Composer & { id?: number };
  origin?: string;
  /** Optional author data used when displaying the piece in event lists */
  author?: Author;
  /** Optional lyrics source text */
  lyricsSource?: string;
  /** Collection references when provided by the backend */
  collections?: CollectionReference[];

  /** --- Event specific properties when a piece is loaded with its events --- */
  /** Date on which the piece was performed */
  date?: string;
  /** Type of the event (rehearsal or service) */
  type?: 'REHEARSAL' | 'SERVICE';
  /** Optional notes attached to the event */
  notes?: string;
  /** Simplified director information */
  director?: { name: string };
}

export interface Event {
  id: number;
  date: string;
  type: 'REHEARSAL' | 'SERVICE';
  /**
   * Optional name for display purposes. Regular events usually do not have
   * a name but holiday entries in the calendar do. The property is optional so
   * that existing API responses without a name remain valid.
   */
  name?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  director?: { id: number; name: string };
  organist?: { id: number; name: string } | null;
  finalized?: boolean;
  version?: number;
  monthlyPlan?: { year: number; month: number; finalized: boolean; version: number } | null;
  pieces: EventPiece[];
}

export interface CreateEventResponse {
  message: string;
  wasUpdated: boolean;
  warning?: string;
  event: Event;
}
