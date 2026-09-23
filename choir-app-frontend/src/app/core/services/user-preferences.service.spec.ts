import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SKIP_GLOBAL_ERROR_REPORTING } from '../interceptors/error-interceptor';
import { UserPreferencesService } from './user-preferences.service';

describe('UserPreferencesService', () => {
  let service: UserPreferencesService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(UserPreferencesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('shares and caches preference loads', () => {
    const results: unknown[] = [];

    service.load().subscribe(value => results.push(value));
    service.load().subscribe(value => results.push(value));

    const request = httpMock.expectOne(req => req.url.endsWith('/users/me/preferences'));
    expect(request.request.context.get(SKIP_GLOBAL_ERROR_REPORTING)).toBeTrue();
    request.flush({ theme: 'dark' });

    service.load().subscribe(value => results.push(value));
    httpMock.expectNone(req => req.url.endsWith('/users/me/preferences'));
    expect(results).toEqual([{ theme: 'dark' }, { theme: 'dark' }, { theme: 'dark' }]);
  });

  it('uses current preferences after a rate-limit response', () => {
    let result: unknown;

    service.load().subscribe(value => result = value);
    const request = httpMock.expectOne(req => req.url.endsWith('/users/me/preferences'));
    request.flush({ message: 'Too many requests' }, { status: 429, statusText: 'Too Many Requests' });

    expect(result).toEqual({});
    expect(service.isLoaded()).toBeTrue();
    service.load().subscribe();
    httpMock.expectNone(req => req.url.endsWith('/users/me/preferences'));
  });

  it('loads again after preferences are cleared', () => {
    service.load().subscribe();
    httpMock.expectOne(req => req.url.endsWith('/users/me/preferences')).flush({ theme: 'light' });

    service.clear();
    expect(service.isLoaded()).toBeFalse();
    service.load().subscribe();
    httpMock.expectOne(req => req.url.endsWith('/users/me/preferences')).flush({ theme: 'dark' });
  });
});
