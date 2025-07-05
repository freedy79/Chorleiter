import { Piece } from "./piece";

export interface Event {
  id: number;
  date: string;
  type: 'REHEARSAL' | 'SERVICE';
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
