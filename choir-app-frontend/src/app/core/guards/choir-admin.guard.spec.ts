import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { BehaviorSubject, firstValueFrom, of } from 'rxjs';

import { ChoirAdminGuard } from './choir-admin.guard';
import { AuthService } from '../services/auth.service';
import { ApiService } from '../services/api.service';

describe('ChoirAdminGuard', () => {
  let guard: ChoirAdminGuard;
  let isAdminSubject: BehaviorSubject<boolean>;
  let router: jasmine.SpyObj<Router>;
  let redirectTree: UrlTree;
  let apiService: { checkChoirAdminStatus: jasmine.Spy };

  beforeEach(() => {
    isAdminSubject = new BehaviorSubject<boolean>(false);
    router = jasmine.createSpyObj('Router', ['createUrlTree']);
    redirectTree = {} as UrlTree;
    router.createUrlTree.and.returnValue(redirectTree);
    apiService = {
      checkChoirAdminStatus: jasmine.createSpy('checkChoirAdminStatus').and.returnValue(of({ isChoirAdmin: false }))
    };

    TestBed.configureTestingModule({
      providers: [
        ChoirAdminGuard,
        { provide: AuthService, useValue: { isAdmin$: isAdminSubject.asObservable() } },
        { provide: ApiService, useValue: apiService },
        { provide: Router, useValue: router }
      ]
    });

    guard = TestBed.inject(ChoirAdminGuard);
  });

  it('allows global admins regardless of choir membership', async () => {
    isAdminSubject.next(true);
    const result = await firstValueFrom(guard.canActivate());
    expect(result).toBeTrue();
  });

  it('allows choir admins returned by the API', async () => {
    apiService.checkChoirAdminStatus.and.returnValue(of({ isChoirAdmin: true }));
    const result = await firstValueFrom(guard.canActivate());
    expect(result).toBeTrue();
  });

  it('redirects users without sufficient privileges', async () => {
    apiService.checkChoirAdminStatus.and.returnValue(of({ isChoirAdmin: false }));
    const result = await firstValueFrom(guard.canActivate());
    expect(router.createUrlTree).toHaveBeenCalledWith(['/collections']);
    expect(result).toEqual(redirectTree);
  });
});
