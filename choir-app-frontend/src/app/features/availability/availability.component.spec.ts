import { of } from 'rxjs';
import { AvailabilityComponent } from './availability.component';
import { UserAvailability } from '@core/models/user-availability';
import { MonthlyPlan } from '@core/models/monthly-plan';

function buildAvailabilities(year: number, month: number, count: number): UserAvailability[] {
  return Array.from({ length: count }, (_, i) => ({
    date: `${year}-${String(month).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`,
    status: 'AVAILABLE'
  }));
}

describe('AvailabilityComponent', () => {
  let component: AvailabilityComponent;
  let apiStub: {
    getAvailabilities: jasmine.Spy;
    getMonthlyPlan: jasmine.Spy;
    getUserAvailabilities: jasmine.Spy;
    getMemberAvailabilities: jasmine.Spy;
  };

  const monthNavStub = {
    previous: ({ year, month }: { year: number; month: number }) =>
      month > 1 ? { year, month: month - 1 } : { year: year - 1, month: 12 },
    next: ({ year, month }: { year: number; month: number }) =>
      month < 12 ? { year, month: month + 1 } : { year: year + 1, month: 1 },
    prevLabel: () => '',
    nextLabel: () => ''
  };

  beforeEach(() => {
    apiStub = {
      getAvailabilities: jasmine.createSpy('getAvailabilities'),
      getMonthlyPlan: jasmine.createSpy('getMonthlyPlan'),
      getUserAvailabilities: jasmine.createSpy('getUserAvailabilities'),
      getMemberAvailabilities: jasmine.createSpy('getMemberAvailabilities')
    };

    component = new AvailabilityComponent(
      {} as any,
      { navigate: jasmine.createSpy('navigate').and.returnValue(Promise.resolve()) } as any,
      monthNavStub as any,
      apiStub as any,
      {} as any,
      { markForCheck: () => void 0 } as any
    );
  });

  it('should map monthly plan notes by date in monthly mode', async () => {
    component.selected = { year: 2026, month: 6 };

    apiStub.getAvailabilities.and.returnValue(of(buildAvailabilities(2026, 6, 6)));
    apiStub.getMonthlyPlan.and.returnValue(of({
      id: 1,
      year: 2026,
      month: 6,
      finalized: false,
      version: 1,
      entries: [
        { id: 10, date: '2026-06-08', notes: ' Gottesdienst ' },
        { id: 11, date: '2026-06-15', notes: '   ' }
      ]
    } as MonthlyPlan));

    await (component as any).loadAvailabilities();

    expect(component.viewMode).toBe('monthly');
    expect(component.monthlyAvailabilities?.length).toBe(6);
    expect(component.monthlyNotesByDate).toEqual({ '2026-06-08': 'Gottesdienst' });
  });

  it('should include per-month notes in combined mode groups', async () => {
    component.selected = { year: 2026, month: 6 };

    apiStub.getAvailabilities.and.callFake((year: number, month: number) => {
      const countByMonth: Record<number, number> = { 6: 4, 7: 2, 8: 1 };
      return of(buildAvailabilities(year, month, countByMonth[month] ?? 0));
    });

    apiStub.getMonthlyPlan.and.callFake((year: number, month: number) => of({
      id: month,
      year,
      month,
      finalized: false,
      version: 1,
      entries: [
        { id: month * 10, date: `${year}-${String(month).padStart(2, '0')}-05`, notes: `Note ${month}` }
      ]
    } as MonthlyPlan));

    await (component as any).loadAvailabilities();

    expect(component.viewMode).toBe('combined');
    expect(component.combinedMonths.length).toBe(3);
    expect(component.combinedMonths[0].period).toEqual({ year: 2026, month: 6 });
    expect(component.combinedMonths[1].period).toEqual({ year: 2026, month: 7 });
    expect(component.combinedMonths[2].period).toEqual({ year: 2026, month: 8 });

    expect(component.combinedMonths[0].notesByDate).toEqual({ '2026-06-05': 'Note 6' });
    expect(component.combinedMonths[1].notesByDate).toEqual({ '2026-07-05': 'Note 7' });
    expect(component.combinedMonths[2].notesByDate).toEqual({ '2026-08-05': 'Note 8' });
  });
});
