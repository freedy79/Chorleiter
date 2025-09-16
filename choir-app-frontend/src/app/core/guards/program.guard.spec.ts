import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { BehaviorSubject, firstValueFrom } from 'rxjs';

import { ProgramGuard } from './program.guard';
import { AuthService } from '../services/auth.service';

describe('ProgramGuard', () => {
  let guard: ProgramGuard;
  let isAdminSubject: BehaviorSubject<boolean>;
  let activeChoirSubject: BehaviorSubject<any>;
  let router: jasmine.SpyObj<Router>;
  let redirectTree: UrlTree;

  beforeEach(() => {
    isAdminSubject = new BehaviorSubject<boolean>(false);
    activeChoirSubject = new BehaviorSubject<any>(null);
    router = jasmine.createSpyObj('Router', ['createUrlTree']);
    redirectTree = {} as UrlTree;
    router.createUrlTree.and.returnValue(redirectTree);

    TestBed.configureTestingModule({
      providers: [
        ProgramGuard,
        {
          provide: AuthService,
          useValue: {
            isAdmin$: isAdminSubject.asObservable(),
            activeChoir$: activeChoirSubject.asObservable()
          }
        },
        { provide: Router, useValue: router }
      ]
    });

    guard = TestBed.inject(ProgramGuard);
  });

  it('allows access when choir admin and module enabled', async () => {
    activeChoirSubject.next({ modules: { programs: true }, membership: { rolesInChoir: ['choir_admin'] } });
    const result = await firstValueFrom(guard.canActivate());
    expect(result).toBeTrue();
  });

  it('allows access for global admins even without choir privileges', async () => {
    isAdminSubject.next(true);
    activeChoirSubject.next({ modules: { programs: true }, membership: { rolesInChoir: ['singer'] } });
    const result = await firstValueFrom(guard.canActivate());
    expect(result).toBeTrue();
  });

  it('redirects when programs module is disabled', async () => {
    isAdminSubject.next(true);
    activeChoirSubject.next({ modules: { programs: false }, membership: { rolesInChoir: ['choir_admin'] } });
    const result = await firstValueFrom(guard.canActivate());
    expect(router.createUrlTree).toHaveBeenCalledWith(['/dashboard']);
    expect(result).toEqual(redirectTree);
  });

  it('redirects singer-only users even if the module is available', async () => {
    activeChoirSubject.next({ modules: { programs: true }, membership: { rolesInChoir: ['singer'] } });
    const result = await firstValueFrom(guard.canActivate());
    expect(router.createUrlTree).toHaveBeenCalledWith(['/dashboard']);
    expect(result).toEqual(redirectTree);
  });
});
