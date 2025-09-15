import { Injectable } from '@angular/core';

export interface MonthYear { year: number; month: number; }

@Injectable({ providedIn: 'root' })
export class MonthNavigationService {
  private change(state: MonthYear, delta: number): MonthYear {
    const date = new Date(state.year, state.month - 1 + delta, 1);
    return { year: date.getFullYear(), month: date.getMonth() + 1 };
  }

  previous(state: MonthYear): MonthYear {
    return this.change(state, -1);
  }

  next(state: MonthYear): MonthYear {
    return this.change(state, 1);
  }

  prevLabel(state: MonthYear, locale = 'de-DE'): string {
    const d = this.change(state, -1);
    return new Date(d.year, d.month - 1, 1).toLocaleDateString(locale, { month: 'long' });
  }

  nextLabel(state: MonthYear, locale = 'de-DE'): string {
    const d = this.change(state, 1);
    return new Date(d.year, d.month - 1, 1).toLocaleDateString(locale, { month: 'long' });
  }
}

