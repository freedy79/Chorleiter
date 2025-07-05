export interface PlanRule {
    id: number;
    choirId: number;
    type: 'REHEARSAL' | 'SERVICE';
    dayOfWeek: number;
    weeks: number[] | null;
    notes?: string | null;
}
