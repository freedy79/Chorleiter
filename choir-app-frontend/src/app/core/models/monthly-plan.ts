import { PlanEntry } from './plan-entry';

export interface MonthlyPlan {
  id: number;
  year: number;
  month: number;
  finalized: boolean;
  version: number;
  entries?: PlanEntry[];
}
