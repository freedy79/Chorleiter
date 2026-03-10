import { TestBed } from '@angular/core/testing';
import { of, EMPTY } from 'rxjs';
import { AppComponent } from './app.component';
import { ApiService } from '@core/services/api.service';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { ServiceUnavailableComponent } from '@features/service-unavailable/service-unavailable.component';
import { ServiceWorkerUpdateService } from '@app/services/service-worker-update.service';
import { ThemeService } from '@core/services/theme.service';
import { PushNotificationService } from '@core/services/push-notification.service';
import { BackendStatusService } from '@core/services/backend-status.service';

class ApiServiceStub {
  pingBackend() { return of({ message: 'PONG' }); }
}

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        AppComponent,
        ServiceUnavailableComponent
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ApiService, useClass: ApiServiceStub },
        { provide: ServiceWorkerUpdateService, useValue: { updateAvailable: EMPTY, updating: EMPTY } },
        { provide: ThemeService, useValue: { initializeTheme: () => {} } },
        { provide: PushNotificationService, useValue: { initializeNotificationClicks: () => {} } },
        { provide: BackendStatusService, useValue: {
          setBackendAvailable: () => {},
          setComingFromUnavailableRedirect: () => {},
          comingFromUnavailableRedirect$: EMPTY
        }}
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render router outlet or maintenance message', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet') || compiled.querySelector('app-service-unavailable')).toBeTruthy();
  });
});
