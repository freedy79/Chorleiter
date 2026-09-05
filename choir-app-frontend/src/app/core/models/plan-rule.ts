export interface PlanRule {
    id: number;
    choirId: number;
    dayOfWeek: number;
    weeks: number[] | null;
    eventType?: 'SERVICE' | 'REHEARSAL';
    notes?: string | null;
}
