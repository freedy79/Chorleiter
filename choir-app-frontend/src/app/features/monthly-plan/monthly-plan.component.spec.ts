import { BehaviorSubject, of, Subject } from 'rxjs';
import { MonthlyPlanComponent } from './monthly-plan.component';
import { MonthlyPlan } from '@core/models/monthly-plan';
import { PlanEntry } from '@core/models/plan-entry';
import { MemberAvailability } from '@core/models/member-availability';
import { UserInChoir } from '@core/models/user';

describe('MonthlyPlanComponent', () => {
  let component: MonthlyPlanComponent;
  let apiStub: {
    getMemberAvailabilities: jasmine.Spy;
    getChoirMembers: jasmine.Spy;
  };
  let planServiceStub: {
    getMonthlyPlan: jasmine.Spy;
    clearMonthlyPlanCache: jasmine.Spy;
  };
  let authStub: any;
  let routerStub: any;
  let routeStub: any;

  beforeEach(() => {
    localStorage.clear();
    apiStub = {
      getMemberAvailabilities: jasmine.createSpy('getMemberAvailabilities'),
      getChoirMembers: jasmine.createSpy('getChoirMembers')
    };
    planServiceStub = {
      getMonthlyPlan: jasmine.createSpy('getMonthlyPlan'),
      clearMonthlyPlanCache: jasmine.createSpy('clearMonthlyPlanCache')
    };
    planServiceStub.getMonthlyPlan.and.returnValue(of(null));
    authStub = {
      activeChoir$: new BehaviorSubject<any>({ id: 42 }),
      isDienstplanManager$: of(false),
      currentUser$: of(null)
    };
    routerStub = {
      navigate: jasmine.createSpy('navigate').and.returnValue(Promise.resolve())
    };
    routeStub = {
      snapshot: { queryParamMap: new Map() },
      queryParamMap: of(new Map())
    };

    component = new MonthlyPlanComponent(
      apiStub as any,
      planServiceStub as any,
      authStub as any,
      {} as any,
      { open: () => null } as any,
      routerStub as any,
      routeStub as any,
      {} as any,
      { prevLabel: () => '', nextLabel: () => '', previous: () => ({ year: 0, month: 0 }), next: () => ({ year: 0, month: 0 }) } as any,
      {} as any,
      { markForCheck: () => void 0 } as any,
      { isEnabled: () => false } as any
    );
  });

  it('should update plan data only after all parallel requests completed', () => {
    const planSubject = new Subject<MonthlyPlan | null>();
    const availabilitySubject = new Subject<MemberAvailability[]>();
    const membersSubject = new Subject<UserInChoir[]>();

    planServiceStub.getMonthlyPlan.and.returnValue(planSubject.asObservable());
    apiStub.getMemberAvailabilities.and.returnValue(availabilitySubject.asObservable());
    apiStub.getChoirMembers.and.returnValue(membersSubject.asObservable());

    const existingPlan: MonthlyPlan = { id: 9, year: 2024, month: 6, finalized: false, version: 1, entries: [] };
    const existingEntry: PlanEntry = { id: 99, date: '2024-06-01' };

    component.isChoirAdmin = true;
    component.selectedYear = 2024;
    component.selectedMonth = 7;
    component.plan = existingPlan;
    component.entries = [existingEntry];
    component.availabilityMap = { 1: { '2024-06-01': 'AVAILABLE' } };

    component.loadPlan(2024, 7);

    expect(component.plan).toBe(existingPlan);
    expect(component.entries[0]).toBe(existingEntry);
    expect(component.isLoadingPlan).toBeTrue();

    const updatedPlan: MonthlyPlan = {
      id: 1,
      year: 2024,
      month: 7,
      finalized: false,
      version: 1,
      entries: [
        {
          id: 1,
          date: '2024-07-01',
          director: { id: 5, name: 'Jane Doe' },
          organist: { id: 6, name: 'John Smith' }
        }
      ]
    };

    planSubject.next(updatedPlan);
    planSubject.complete();

    expect(component.plan).toBe(existingPlan);
    expect(component.entries[0]).toBe(existingEntry);

    const availabilities: MemberAvailability[] = [{ userId: 5, date: '2024-07-01', status: 'AVAILABLE' }];
    availabilitySubject.next(availabilities);
    availabilitySubject.complete();

    expect(component.availabilityMap[1]).toBeTruthy();
    expect(component.availabilityMap[5]).toBeUndefined();

    const members: UserInChoir[] = [
      { id: 5, name: 'Doe', firstName: 'Jane', email: 'jane@example.test', membership: { rolesInChoir: ['director'], registrationStatus: 'REGISTERED' } },
      { id: 6, name: 'Smith', firstName: 'John', email: 'john@example.test', membership: { rolesInChoir: ['organist'], registrationStatus: 'REGISTERED' } }
    ];
    membersSubject.next(members);
    membersSubject.complete();

    expect(component.plan).toEqual(updatedPlan);
    expect(component.entries.length).toBe(1);
    expect(component.entries[0].id).toBe(1);
    expect(component.members).toEqual(members);
    expect(component.directors.map(d => d.id)).toEqual([5]);
    expect(component.organists.map(o => o.id)).toEqual([6]);
    expect(component.availabilityMap[5]['2024-07-01']).toBe('AVAILABLE');
    expect(component.isLoadingPlan).toBeFalse();
  });

  it('should remember the selected month and tab per choir when month changes', () => {
    component.selectedYear = 2026;
    component.selectedMonth = 9;
    component.selectedTab = 1;

    component.monthChanged();

    const raw = localStorage.getItem('monthlyPlan:lastState:42');
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!)).toEqual({ year: 2026, month: 9, tab: 1 });
    expect(routerStub.navigate).toHaveBeenCalledWith([], jasmine.objectContaining({
      queryParams: { year: 2026, month: 9, tab: 'avail' }
    }));
  });

  it('should restore a previously stored planning month for the active choir', () => {
    localStorage.setItem('monthlyPlan:lastState:42', JSON.stringify({ year: 2026, month: 11, tab: 1 }));

    const restored = (component as any).getStoredPlanningState();

    expect(restored).toEqual({ year: 2026, month: 11, tab: 1 });
  });
});
