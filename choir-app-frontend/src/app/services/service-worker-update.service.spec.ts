import { TestBed } from '@angular/core/testing';
import { SwUpdate, VersionEvent } from '@angular/service-worker';
import { ServiceWorkerUpdateService } from './service-worker-update.service';
import { Subject } from 'rxjs';

describe('ServiceWorkerUpdateService', () => {
  let service: ServiceWorkerUpdateService;
  let swUpdateMock: jasmine.SpyObj<SwUpdate>;
  let versionUpdatesSubject: Subject<VersionEvent>;

  beforeEach(() => {
    versionUpdatesSubject = new Subject<VersionEvent>();

    swUpdateMock = jasmine.createSpyObj('SwUpdate', [
      'checkForUpdate',
      'activateUpdate'
    ]);
    swUpdateMock.isEnabled = true;
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

  it('sollte VERSION_READY Events erkennen', (done) => {
    service.updateAvailable.subscribe(available => {
      if (available) {
        expect(available).toBe(true);
        done();
      }
    });

    versionUpdatesSubject.next({
      type: 'VERSION_READY',
      latestVersion: { hash: 'test', appData: {} },
      currentVersion: { hash: 'old', appData: {} }
    });
  });

  it('sollte initiateUpdate() aufrufen können', async () => {
    swUpdateMock.activateUpdate.and.returnValue(Promise.resolve());

    await service.activateUpdate();

    expect(swUpdateMock.activateUpdate).toHaveBeenCalled();
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

  it('sollte unregisterServiceWorker() aufrufen können', async () => {
    spyOn(navigator.serviceWorker, 'getRegistration').and.returnValue(
      Promise.resolve(undefined)
    );

    const result = await service.unregisterServiceWorker();

    expect(result).toBe(false);
  });
});
