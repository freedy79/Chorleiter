export interface PlanRule {
    id: number;
    choirId: number;
    dayOfWeek: number;
    weeks: number[] | null;
    notes?: string | null;
}
