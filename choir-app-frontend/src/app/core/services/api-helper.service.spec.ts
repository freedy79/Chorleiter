import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { ApiHelperService } from './api-helper.service';
import { NotificationService } from './notification.service';

describe('ApiHelperService', () => {
  let service: ApiHelperService;
  let notificationServiceSpy: jasmine.SpyObj<NotificationService>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('NotificationService', [
      'success',
      'error',
      'warning',
      'info'
    ]);

    TestBed.configureTestingModule({
      providers: [
        ApiHelperService,
        { provide: NotificationService, useValue: spy }
      ]
    });

    service = TestBed.inject(ApiHelperService);
    notificationServiceSpy = TestBed.inject(NotificationService) as jasmine.SpyObj<NotificationService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('handleApiCall', () => {
    it('should emit result on success', (done) => {
      const testData = { id: 1, name: 'Test' };
      const observable$ = of(testData);

      service.handleApiCall(observable$).subscribe({
        next: (result) => {
          expect(result).toEqual(testData);
          done();
        }
      });
    });

    it('should show success notification when successMessage is provided', (done) => {
      const observable$ = of({ success: true });

      service.handleApiCall(observable$, {
        successMessage: 'Operation successful'
      }).subscribe({
        next: () => {
          expect(notificationServiceSpy.success).toHaveBeenCalledWith(
            'Operation successful',
            undefined
          );
          done();
        }
      });
    });

    it('should not show success notification when silent is true', (done) => {
      const observable$ = of({ success: true });

      service.handleApiCall(observable$, {
        successMessage: 'Operation successful',
        silent: true
      }).subscribe({
        next: () => {
          expect(notificationServiceSpy.success).not.toHaveBeenCalled();
          done();
        }
      });
    });

    it('should call onSuccess handler when provided', (done) => {
      const testData = { id: 1 };
      const observable$ = of(testData);
      const onSuccessSpy = jasmine.createSpy('onSuccess');

      service.handleApiCall(observable$, {
        onSuccess: onSuccessSpy
      }).subscribe({
        next: () => {
          expect(onSuccessSpy).toHaveBeenCalledWith(testData);
          done();
        }
      });
    });

    it('should handle loading indicator on success', (done) => {
      const loadingIndicator = new BehaviorSubject<boolean>(false);
      const observable$ = of({ success: true });

      expect(loadingIndicator.value).toBe(false);

      service.handleApiCall(observable$, {
        loadingIndicator
      }).subscribe({
        next: () => {
          // Should be set back to false after completion
          expect(loadingIndicator.value).toBe(false);
          done();
        }
      });
    });

    it('should show error notification on failure', (done) => {
      const httpError = new HttpErrorResponse({
        error: { message: 'Server error' },
        status: 500
      });
      const observable$ = throwError(() => httpError);

      service.handleApiCall(observable$).subscribe({
        error: () => {
          expect(notificationServiceSpy.error).toHaveBeenCalledWith(
            httpError,
            undefined
          );
          done();
        }
      });
    });

    it('should use custom error message when provided', (done) => {
      const httpError = new HttpErrorResponse({ status: 500 });
      const observable$ = throwError(() => httpError);

      service.handleApiCall(observable$, {
        errorMessage: 'Custom error message'
      }).subscribe({
        error: () => {
          expect(notificationServiceSpy.error).toHaveBeenCalledWith(
            'Custom error message',
            undefined
          );
          done();
        }
      });
    });

    it('should not show error notification when silent is true', (done) => {
      const httpError = new HttpErrorResponse({ status: 500 });
      const observable$ = throwError(() => httpError);

      service.handleApiCall(observable$, {
        silent: true
      }).subscribe({
        error: () => {
          expect(notificationServiceSpy.error).not.toHaveBeenCalled();
          done();
        }
      });
    });

    it('should call onError handler when provided', (done) => {
      const httpError = new HttpErrorResponse({ status: 500 });
      const observable$ = throwError(() => httpError);
      const onErrorSpy = jasmine.createSpy('onError');

      service.handleApiCall(observable$, {
        onError: onErrorSpy
      }).subscribe({
        error: () => {
          expect(onErrorSpy).toHaveBeenCalledWith(httpError);
          done();
        }
      });
    });

    it('should suppress error notification when onError returns true', (done) => {
      const httpError = new HttpErrorResponse({ status: 500 });
      const observable$ = throwError(() => httpError);
      const onErrorSpy = jasmine.createSpy('onError').and.returnValue(true);

      service.handleApiCall(observable$, {
        onError: onErrorSpy
      }).subscribe({
        error: () => {
          expect(onErrorSpy).toHaveBeenCalled();
          expect(notificationServiceSpy.error).not.toHaveBeenCalled();
          done();
        }
      });
    });

    it('should handle loading indicator on failure', (done) => {
      const loadingIndicator = new BehaviorSubject<boolean>(false);
      const httpError = new HttpErrorResponse({ status: 500 });
      const observable$ = throwError(() => httpError);

      service.handleApiCall(observable$, {
        loadingIndicator
      }).subscribe({
        error: () => {
          // Should be set back to false after error
          expect(loadingIndicator.value).toBe(false);
          done();
        }
      });
    });

    it('should use custom durations for notifications', (done) => {
      const observable$ = of({ success: true });

      service.handleApiCall(observable$, {
        successMessage: 'Success',
        successDuration: 10000
      }).subscribe({
        next: () => {
          expect(notificationServiceSpy.success).toHaveBeenCalledWith(
            'Success',
            10000
          );
          done();
        }
      });
    });

    it('should use custom error duration', (done) => {
      const httpError = new HttpErrorResponse({ status: 500 });
      const observable$ = throwError(() => httpError);

      service.handleApiCall(observable$, {
        errorMessage: 'Error',
        errorDuration: 8000
      }).subscribe({
        error: () => {
          expect(notificationServiceSpy.error).toHaveBeenCalledWith(
            'Error',
            8000
          );
          done();
        }
      });
    });
  });

  describe('withErrorHandling', () => {
    it('should handle errors with default message extraction', (done) => {
      const httpError = new HttpErrorResponse({
        error: { message: 'Server error' },
        status: 500
      });
      const observable$ = throwError(() => httpError);

      service.withErrorHandling(observable$).subscribe({
        error: () => {
          expect(notificationServiceSpy.error).toHaveBeenCalled();
          done();
        }
      });
    });

    it('should use custom error message when provided', (done) => {
      const httpError = new HttpErrorResponse({ status: 500 });
      const observable$ = throwError(() => httpError);

      service.withErrorHandling(observable$, 'Custom error').subscribe({
        error: () => {
          expect(notificationServiceSpy.error).toHaveBeenCalledWith(
            'Custom error',
            undefined
          );
          done();
        }
      });
    });
  });

  describe('withLoading', () => {
    it('should manage loading state without notifications', (done) => {
      const loadingIndicator = new BehaviorSubject<boolean>(false);
      const observable$ = of({ success: true });

      service.withLoading(observable$, loadingIndicator).subscribe({
        next: () => {
          expect(loadingIndicator.value).toBe(false);
          expect(notificationServiceSpy.success).not.toHaveBeenCalled();
          expect(notificationServiceSpy.error).not.toHaveBeenCalled();
          done();
        }
      });
    });

    it('should set loading to false even after error', (done) => {
      const loadingIndicator = new BehaviorSubject<boolean>(false);
      const httpError = new HttpErrorResponse({ status: 500 });
      const observable$ = throwError(() => httpError);

      service.withLoading(observable$, loadingIndicator).subscribe({
        error: () => {
          expect(loadingIndicator.value).toBe(false);
          expect(notificationServiceSpy.error).not.toHaveBeenCalled();
          done();
        }
      });
    });
  });
});
