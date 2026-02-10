import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('MatSnackBar', ['open']);

    TestBed.configureTestingModule({
      providers: [
        NotificationService,
        { provide: MatSnackBar, useValue: spy }
      ]
    });

    service = TestBed.inject(NotificationService);
    snackBarSpy = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('success', () => {
    it('should display success message with default duration', () => {
      service.success('Operation successful');

      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Operation successful',
        'OK',
        jasmine.objectContaining({
          duration: 3000,
          panelClass: 'success-snackbar',
          verticalPosition: 'top'
        })
      );
    });

    it('should display success message with custom duration', () => {
      service.success('Operation successful', 5000);

      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Operation successful',
        'OK',
        jasmine.objectContaining({
          duration: 5000,
          panelClass: 'success-snackbar'
        })
      );
    });
  });

  describe('error', () => {
    it('should display error message from string', () => {
      service.error('Something went wrong');

      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Something went wrong',
        'Schließen',
        jasmine.objectContaining({
          duration: 5000,
          panelClass: 'error-snackbar',
          verticalPosition: 'top'
        })
      );
    });

    it('should extract error message from HttpErrorResponse with error.message', () => {
      const httpError = new HttpErrorResponse({
        error: { message: 'Server error message' },
        status: 500,
        statusText: 'Internal Server Error'
      });

      service.error(httpError);

      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Server error message',
        'Schließen',
        jasmine.objectContaining({
          duration: 5000,
          panelClass: 'error-snackbar'
        })
      );
    });

    it('should use status text if error.message not available', () => {
      const httpError = new HttpErrorResponse({
        error: {},
        status: 500,
        statusText: 'Internal Server Error'
      });

      service.error(httpError);

      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Fehler: Internal Server Error',
        'Schließen',
        jasmine.objectContaining({
          duration: 5000,
          panelClass: 'error-snackbar'
        })
      );
    });

    it('should provide status-specific message for 404', () => {
      const httpError = new HttpErrorResponse({
        error: {},
        status: 404,
        statusText: 'Not Found'
      });

      service.error(httpError);

      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Fehler: Ressource nicht gefunden.',
        'Schließen',
        jasmine.objectContaining({
          duration: 5000,
          panelClass: 'error-snackbar'
        })
      );
    });

    it('should provide status-specific message for 401', () => {
      const httpError = new HttpErrorResponse({
        error: {},
        status: 401,
        statusText: 'Unauthorized'
      });

      service.error(httpError);

      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Fehler: Nicht autorisiert.',
        'Schließen',
        jasmine.objectContaining({
          duration: 5000,
          panelClass: 'error-snackbar'
        })
      );
    });

    it('should handle network error (status 0)', () => {
      const httpError = new HttpErrorResponse({
        error: {},
        status: 0,
        statusText: 'Unknown Error'
      });

      service.error(httpError);

      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Fehler: Keine Verbindung zum Server.',
        'Schließen',
        jasmine.objectContaining({
          duration: 5000,
          panelClass: 'error-snackbar'
        })
      );
    });

    it('should extract message from Error object', () => {
      const error = new Error('Custom error message');

      service.error(error);

      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Custom error message',
        'Schließen',
        jasmine.objectContaining({
          duration: 5000,
          panelClass: 'error-snackbar'
        })
      );
    });

    it('should use custom duration for error', () => {
      service.error('Error message', 10000);

      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Error message',
        'Schließen',
        jasmine.objectContaining({
          duration: 10000,
          panelClass: 'error-snackbar'
        })
      );
    });
  });

  describe('warning', () => {
    it('should display warning message with default duration', () => {
      service.warning('Warning message');

      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Warning message',
        'OK',
        jasmine.objectContaining({
          duration: 4000,
          panelClass: 'warning-snackbar',
          verticalPosition: 'top'
        })
      );
    });

    it('should display warning message with custom duration', () => {
      service.warning('Warning message', 6000);

      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Warning message',
        'OK',
        jasmine.objectContaining({
          duration: 6000,
          panelClass: 'warning-snackbar'
        })
      );
    });
  });

  describe('info', () => {
    it('should display info message with default duration', () => {
      service.info('Info message');

      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Info message',
        'OK',
        jasmine.objectContaining({
          duration: 3000,
          panelClass: 'info-snackbar',
          verticalPosition: 'top'
        })
      );
    });

    it('should display info message with custom duration', () => {
      service.info('Info message', 7000);

      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Info message',
        'OK',
        jasmine.objectContaining({
          duration: 7000,
          panelClass: 'info-snackbar'
        })
      );
    });
  });
});
