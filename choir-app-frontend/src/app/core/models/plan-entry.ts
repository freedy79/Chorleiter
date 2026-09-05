export interface PlanEntry {
  id: number;
  date: string;
  eventType?: 'SERVICE' | 'REHEARSAL';
  notes?: string;
  linkedEventId?: number | null;
  linkedEventType?: 'SERVICE' | 'REHEARSAL' | null;
  linkedEvent?: { id: number; type: 'SERVICE' | 'REHEARSAL'; date: string } | null;
  programId?: string | null;
  program?: { id: string; title: string; status: 'draft' | 'published' | 'archived' } | null;
  /** Automatically generated note for church holidays */
  holidayHint?: string;
  director?: { id: number; name: string };
  organist?: { id: number; name: string } | null;
}
