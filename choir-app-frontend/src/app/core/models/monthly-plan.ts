import { Event } from './event';

export interface MonthlyPlan {
  id: number;
  year: number;
  month: number;
  finalized: boolean;
  version: number;
  events?: Event[];
}
