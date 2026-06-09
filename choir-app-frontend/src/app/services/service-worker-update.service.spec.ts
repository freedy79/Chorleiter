import { TestBed } from '@angular/core/testing';
import { SwUpdate, VersionEvent } from '@angular/service-worker';
import { ServiceWorkerUpdateService } from './service-worker-update.service';
import { Subject } from 'rxjs';
import { fakeAsync, tick } from '@angular/core/testing';

describe('ServiceWorkerUpdateService', () => {
  let service: ServiceWorkerUpdateService;
  let swUpdateMock: jasmine.SpyObj<SwUpdate>;
  let versionUpdatesSubject: Subject<VersionEvent>;

  beforeEach(() => {
    localStorage.removeItem('sw-dismissed-version');
    localStorage.removeItem('sw-activated-version');

    versionUpdatesSubject = new Subject<VersionEvent>();

    swUpdateMock = jasmine.createSpyObj('SwUpdate', [
      'checkForUpdate',
      'activateUpdate'
    ]);
    swUpdateMock.checkForUpdate.and.returnValue(Promise.resolve(false));
    Object.defineProperty(swUpdateMock, 'isEnabled', { value: true, writable: true });
    Object.defineProperty(swUpdateMock, 'versionUpdates', {
      get: () => versionUpdatesSubject.asObservable()
    });

    TestBed.configureTestingModule({
      providers: [
        ServiceWorkerUpdateService,
        { provide: SwUpdate, useValue: swUpdateMock }
      ]
    });

    service = TestBed.inject(ServiceWorkerUpdateService);
  });

  it('sollte erstellt werden', () => {
    expect(service).toBeTruthy();
  });

  it('sollte VERSION_READY Events erkennen', fakeAsync(() => {
    let detected = false;

    service.updateAvailable.subscribe(available => {
      if (available) {
        expect(available).toBe(true);
        detected = true;
      }
    });

    versionUpdatesSubject.next({
      type: 'VERSION_READY',
      latestVersion: { hash: 'test', appData: {} },
      currentVersion: { hash: 'old', appData: {} }
    });

    tick(101);

    expect(detected).toBe(true);
  }));

  it('sollte einen verworfenen Hash nicht erneut melden', fakeAsync(() => {
    localStorage.setItem('sw-dismissed-version', 'test');

    versionUpdatesSubject.next({
      type: 'VERSION_READY',
      latestVersion: { hash: 'test', appData: {} },
      currentVersion: { hash: 'old', appData: {} }
    });

    tick(101);

    expect(service.isUpdateAvailable()).toBe(false);
  }));

  it('sollte initiateUpdate() aufrufen können', async () => {
    swUpdateMock.activateUpdate.and.returnValue(Promise.resolve(true));
    // Spy on the protected reloadPage method to prevent actual page reload
    spyOn(service as any, 'reloadPage');

    await service.activateUpdate();

    expect(swUpdateMock.activateUpdate).toHaveBeenCalled();
    expect((service as any).reloadPage).toHaveBeenCalled();
  });

  it('sollte checkForUpdates() aufrufen können', async () => {
    swUpdateMock.checkForUpdate.and.returnValue(Promise.resolve(true));

    const result = await service.checkForUpdates();

    expect(result).toBe(true);
    expect(swUpdateMock.checkForUpdate).toHaveBeenCalled();
  });

  it('sollte isUpdateAvailable() Status zurückgeben', () => {
    expect(service.isUpdateAvailable()).toBe(false);
  });

  it('sollte isUpdating() Status zurückgeben', () => {
    expect(service.isUpdating()).toBe(false);
  });

  it('sollte dismissUpdate() den Status zurücksetzen', fakeAsync(() => {
    service.updateAvailable.subscribe(available => {
      if (available) {
        service.dismissUpdate();
      }
    });

    versionUpdatesSubject.next({
      type: 'VERSION_READY',
      latestVersion: { hash: 'test', appData: {} },
      currentVersion: { hash: 'old', appData: {} }
    });

    tick(101);

    expect(service.isUpdateAvailable()).toBe(false);
    expect(localStorage.getItem('sw-dismissed-version')).toBe('test');
  }));

  it('sollte unregisterServiceWorker() aufrufen können', async () => {
    spyOn(navigator.serviceWorker, 'getRegistration').and.returnValue(
      Promise.resolve(undefined)
    );

    const result = await service.unregisterServiceWorker();

    expect(result).toBe(false);
  });
});
