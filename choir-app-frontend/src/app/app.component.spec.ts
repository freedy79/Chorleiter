import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AppComponent } from './app.component';
import { ApiService } from '@core/services/api.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ServiceUnavailableComponent } from '@features/service-unavailable/service-unavailable.component';

class ApiServiceStub {
  pingBackend() { return of({ message: 'PONG' }); }
}

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        AppComponent,
        ServiceUnavailableComponent,
        HttpClientTestingModule,
        RouterTestingModule
      ],
      providers: [{ provide: ApiService, useClass: ApiServiceStub }]
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
