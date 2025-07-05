export interface PlanEntry {
  id: number;
  date: string;
  type: 'REHEARSAL' | 'SERVICE';
  notes?: string;
  director?: { id: number; name: string };
  organist?: { id: number; name: string } | null;
}
