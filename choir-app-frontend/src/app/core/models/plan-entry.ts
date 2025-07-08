export interface PlanEntry {
  id: number;
  date: string;
  notes?: string;
  /** Automatically generated note for church holidays */
  holidayHint?: string;
  director?: { id: number; name: string };
  organist?: { id: number; name: string } | null;
}
