import { Piece } from "./piece";

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
  pieces: Piece[];
}

export interface CreateEventResponse {
  message: string;
  wasUpdated: boolean;
  warning?: string;
  event: Event;
}
