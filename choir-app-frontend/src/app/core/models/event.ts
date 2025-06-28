import { Piece } from "./piece";

export interface Event {
  id: number;
  date: string;
  type: 'REHEARSAL' | 'SERVICE';
  notes?: string;
  createdAt: string;
  updatedAt: string;
  director?: { name: string };
  pieces: Piece[];
}

export interface CreateEventResponse {
  message: string;
  wasUpdated: boolean;
  warning?: string;
  event: Event;
}
