import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { BehaviorSubject, firstValueFrom } from 'rxjs';

import { AdminGuard } from './admin-guard';
import { AuthService } from '../services/auth.service';

describe('AdminGuard', () => {
  let guard: AdminGuard;
  let isAdminSubject: BehaviorSubject<boolean>;
  let router: jasmine.SpyObj<Router>;
  let redirectTree: UrlTree;

  beforeEach(() => {
    isAdminSubject = new BehaviorSubject<boolean>(false);
    router = jasmine.createSpyObj('Router', ['createUrlTree']);
    redirectTree = {} as UrlTree;
    router.createUrlTree.and.returnValue(redirectTree);

    TestBed.configureTestingModule({
      providers: [
        AdminGuard,
        { provide: AuthService, useValue: { isAdmin$: isAdminSubject.asObservable() } },
        { provide: Router, useValue: router }
      ]
    });

    guard = TestBed.inject(AdminGuard);
  });

  it('allows access for global admins', async () => {
    isAdminSubject.next(true);
    const result = await firstValueFrom(guard.canActivate());
    expect(result).toBeTrue();
  });

  it('redirects non-admin users to the dashboard', async () => {
    isAdminSubject.next(false);
    const result = await firstValueFrom(guard.canActivate());
    expect(router.createUrlTree).toHaveBeenCalledWith(['/dashboard']);
    expect(result).toEqual(redirectTree);
  });
});
