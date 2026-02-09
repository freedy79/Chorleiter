import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { OfflineIndicatorComponent } from './offline-indicator.component';

describe('OfflineIndicatorComponent', () => {
  let component: OfflineIndicatorComponent;
  let fixture: ComponentFixture<OfflineIndicatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfflineIndicatorComponent, BrowserAnimationsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(OfflineIndicatorComponent);
    component = fixture.componentInstance;
  });

  it('sollte erstellt werden', () => {
    expect(component).toBeTruthy();
  });

  it('sollte initial Online-Status überprüfen', () => {
    fixture.detectChanges();
    expect(component.isOffline).toBe(!navigator.onLine);
  });

  it('sollte offline anzeigen wenn Event auslöst wird', () => {
    fixture.detectChanges();

    const offlineEvent = new Event('offline');
    window.dispatchEvent(offlineEvent);

    expect(component.isOffline).toBe(true);
  });

  it('sollte nicht offline anzeigen wenn Event auslöst wird', () => {
    component.isOffline = true;
    fixture.detectChanges();

    const onlineEvent = new Event('online');
    window.dispatchEvent(onlineEvent);

    expect(component.isOffline).toBe(false);
  });

  it('sollte offline Indikatoren nicht anzeigen wenn online', () => {
    component.isOffline = false;
    fixture.detectChanges();

    const indicator = fixture.nativeElement.querySelector('.offline-indicator');
    expect(indicator).toBeFalsy();
  });

  it('sollte offline Indikatoren anzeigen wenn offline', () => {
    component.isOffline = true;
    fixture.detectChanges();

    const indicator = fixture.nativeElement.querySelector('.offline-indicator');
    expect(indicator).toBeTruthy();
  });
});
