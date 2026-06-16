export interface PlanEntry {
  id: number;
  date: string;
  notes?: string;
  linkedEventId?: number | null;
  linkedEventType?: 'SERVICE' | 'REHEARSAL' | null;
  programId?: string | null;
  program?: { id: string; title: string; status: 'draft' | 'published' | 'archived' } | null;
  /** Automatically generated note for church holidays */
  holidayHint?: string;
  director?: { id: number; name: string };
  organist?: { id: number; name: string } | null;
}
