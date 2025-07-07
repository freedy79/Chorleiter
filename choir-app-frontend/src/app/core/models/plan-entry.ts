export interface PlanEntry {
  id: number;
  date: string;
  notes?: string;
  director?: { id: number; name: string };
  organist?: { id: number; name: string } | null;
}
