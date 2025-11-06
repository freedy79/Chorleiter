import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MonthlyPlanService } from './monthly-plan.service';
import { environment } from 'src/environments/environment';
import { MonthlyPlan } from '../models/monthly-plan';

describe('MonthlyPlanService', () => {
  let service: MonthlyPlanService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });

    service = TestBed.inject(MonthlyPlanService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should cache monthly plan responses per month', () => {
    let firstResult: MonthlyPlan | null | undefined;
    service.getMonthlyPlan(2024, 5).subscribe(plan => (firstResult = plan));

    const initialRequest = httpMock.expectOne(`${environment.apiUrl}/monthly-plans/2024/5`);
    const planResponse: MonthlyPlan = { id: 1, year: 2024, month: 5, finalized: false, version: 1, entries: [] };
    initialRequest.flush(planResponse);

    expect(firstResult).toEqual(planResponse);

    let cachedResult: MonthlyPlan | null | undefined;
    service.getMonthlyPlan(2024, 5).subscribe(plan => (cachedResult = plan));

    httpMock.expectNone(`${environment.apiUrl}/monthly-plans/2024/5`);
    expect(cachedResult).toEqual(planResponse);
  });

  it('should refetch data after cache invalidation', () => {
    service.getMonthlyPlan(2024, 6).subscribe();
    const first = httpMock.expectOne(`${environment.apiUrl}/monthly-plans/2024/6`);
    const initialResponse: MonthlyPlan = { id: 2, year: 2024, month: 6, finalized: false, version: 1, entries: [] };
    first.flush(initialResponse);

    service.clearMonthlyPlanCache(2024, 6);

    let refreshed: MonthlyPlan | null | undefined;
    service.getMonthlyPlan(2024, 6).subscribe(plan => (refreshed = plan));

    const refreshedRequest = httpMock.expectOne(`${environment.apiUrl}/monthly-plans/2024/6`);
    const refreshedResponse: MonthlyPlan = { id: 2, year: 2024, month: 6, finalized: true, version: 2, entries: [] };
    refreshedRequest.flush(refreshedResponse);

    expect(refreshed).toEqual(refreshedResponse);
  });
});
