import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { PwaUpdateNotificationComponent } from './pwa-update-notification.component';
import { ServiceWorkerUpdateService } from '../../services/service-worker-update.service';
import { of } from 'rxjs';

describe('PwaUpdateNotificationComponent', () => {
  let component: PwaUpdateNotificationComponent;
  let fixture: ComponentFixture<PwaUpdateNotificationComponent>;
  let swUpdateService: jasmine.SpyObj<ServiceWorkerUpdateService>;

  beforeEach(async () => {
    const swUpdateServiceMock = jasmine.createSpyObj('ServiceWorkerUpdateService', [
      'activateUpdate',
      'checkForUpdates',
      'isUpdateAvailable',
      'isUpdating',
      'unregisterServiceWorker',
      'getServiceWorkerInfo'
    ]);

    swUpdateServiceMock.updateAvailable = of(false);
    swUpdateServiceMock.updating = of(false);

    await TestBed.configureTestingModule({
      imports: [PwaUpdateNotificationComponent, NoopAnimationsModule],
      providers: [
        { provide: ServiceWorkerUpdateService, useValue: swUpdateServiceMock }
      ]
    }).compileComponents();

    swUpdateService = TestBed.inject(ServiceWorkerUpdateService) as jasmine.SpyObj<ServiceWorkerUpdateService>;
    fixture = TestBed.createComponent(PwaUpdateNotificationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // trigger ngOnInit so subscriptions complete
  });

  it('sollte erstellt werden', () => {
    expect(component).toBeTruthy();
  });

  it('sollte nicht sichtbar sein wenn kein Update verfügbar ist', () => {
    fixture.detectChanges();
    const notification = fixture.nativeElement.querySelector('.pwa-update-notification');
    expect(notification).toBeFalsy();
  });

  it('sollte sichtbar sein wenn Update verfügbar ist', () => {
    component.updateAvailable = true;
    fixture.detectChanges();
    const notification = fixture.nativeElement.querySelector('.pwa-update-notification');
    expect(notification).toBeTruthy();
  });

  it('sollte activateUpdate aufrufen wenn Update-Button geklickt wird', async () => {
    swUpdateService.activateUpdate.and.returnValue(Promise.resolve());
    component.updateAvailable = true;
    fixture.detectChanges();

    const updateButton = fixture.nativeElement.querySelector('.btn-primary');
    updateButton.click();

    expect(swUpdateService.activateUpdate).toHaveBeenCalled();
  });

  it('sollte Benachrichtigung ausblenden wenn Dismiss-Button geklickt wird', () => {
    component.updateAvailable = true;
    fixture.detectChanges();

    const dismissButton = fixture.nativeElement.querySelector('.btn-secondary');
    dismissButton.click();

    expect(component.updateAvailable).toBe(false);
  });

  it('sollte Buttons deaktivieren während Update läuft', () => {
    component.updateAvailable = true;
    component.isUpdating = true;
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('.btn');
    buttons.forEach((btn: HTMLButtonElement) => {
      expect(btn.disabled).toBe(true);
    });
  });
});
