import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BehaviorSubject } from 'rxjs';

import { ErrorDisplayComponent } from './error-display.component';
import { AppError, ErrorService } from 'src/app/core/services/error.service';

class ErrorServiceMock {
  private readonly errorSubject = new BehaviorSubject<AppError | null>(null);
  error$ = this.errorSubject.asObservable();

  setError(error: AppError | null): void {
    this.errorSubject.next(error);
  }

  clearError(): void {
    this.errorSubject.next(null);
  }
}

describe('ErrorDisplayComponent', () => {
  let component: ErrorDisplayComponent;
  let fixture: ComponentFixture<ErrorDisplayComponent>;
  let errorServiceMock: ErrorServiceMock;

  beforeEach(async () => {
    errorServiceMock = new ErrorServiceMock();

    await TestBed.configureTestingModule({
      imports: [ErrorDisplayComponent],
      providers: [
        { provide: ErrorService, useValue: errorServiceMock }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ErrorDisplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows retry button when error has retryAction', () => {
    const retryAction = jasmine.createSpy('retryAction');
    errorServiceMock.setError({
      message: 'Netzwerkfehler',
      retryAction,
      retryLabel: 'Nochmal laden'
    });

    fixture.detectChanges();

    const retryButton = fixture.debugElement.query(By.css('button[color="primary"]'));
    expect(retryButton).toBeTruthy();
    expect(retryButton.nativeElement.textContent).toContain('Nochmal laden');
  });

  it('executes retry action and clears error when retry is clicked', () => {
    const retryAction = jasmine.createSpy('retryAction');
    errorServiceMock.setError({
      message: 'Serverfehler',
      retryAction
    });
    fixture.detectChanges();

    const retryButton = fixture.debugElement.query(By.css('button[color="primary"]'));
    retryButton.nativeElement.click();
    fixture.detectChanges();

    expect(retryAction).toHaveBeenCalledTimes(1);
    const overlay = fixture.debugElement.query(By.css('.error-overlay'));
    expect(overlay).toBeNull();
  });

  it('does not show retry button when retryAction is missing', () => {
    errorServiceMock.setError({
      message: 'Unbekannter Fehler'
    });
    fixture.detectChanges();

    const retryButton = fixture.debugElement.query(By.css('button[color="primary"]'));
    expect(retryButton).toBeNull();
  });
});
