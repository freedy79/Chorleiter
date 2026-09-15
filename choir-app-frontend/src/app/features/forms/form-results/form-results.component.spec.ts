import { ActivatedRoute } from '@angular/router';
import { FormResultsComponent } from './form-results.component';

describe('FormResultsComponent', () => {
  const routeStub = {
    snapshot: {
      paramMap: {
        get: () => '3',
      },
    },
  } as unknown as ActivatedRoute;

  const formServiceStub = {
    getFormById: jasmine.createSpy('getFormById'),
    getSubmissions: jasmine.createSpy('getSubmissions'),
    getStatistics: jasmine.createSpy('getStatistics'),
    deleteSubmission: jasmine.createSpy('deleteSubmission'),
  };

  const notifyStub = {
    error: jasmine.createSpy('error'),
    success: jasmine.createSpy('success'),
  };

  const dialogHelperStub = {
    confirm: jasmine.createSpy('confirm')
  };

  const component = new FormResultsComponent(
    routeStub,
    formServiceStub as any,
    dialogHelperStub as any,
    notifyStub as any,
  );

  it('should preserve submission time for ISO timestamps', () => {
    const result = component.getSubmissionDate('2026-06-17T18:45:12.000Z');

    expect(result).not.toBeNull();
    expect(result?.toISOString()).toBe('2026-06-17T18:45:12.000Z');
  });

  it('should return null for invalid timestamps', () => {
    expect(component.getSubmissionDate('not-a-date')).toBeNull();
  });
});
