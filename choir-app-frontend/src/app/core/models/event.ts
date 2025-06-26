import { Piece } from "./piece";

export interface Event {
  id: number;
  date: string;
  type: 'REHEARSAL' | 'SERVICE';
  notes?: string;
  pieces: Piece[];
}

export interface CreateEventResponse {
  message: string;
  wasUpdated: boolean;
  event: Event;
}
