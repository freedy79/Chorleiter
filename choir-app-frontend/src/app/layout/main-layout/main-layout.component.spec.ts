import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HelpService } from '@core/services/help.service';
import { AuthService } from '@core/services/auth.service';
import { MenuVisibilityService } from '@core/services/menu-visibility.service';
import { ApiService } from '@core/services/api.service';
import { BreakpointObserver } from '@angular/cdk/layout';
import { ThemeService } from '@core/services/theme.service';
import { LoanCartService } from '@core/services/loan-cart.service';
import { BehaviorSubject, of, firstValueFrom, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

import { MainLayoutComponent } from './main-layout.component';

describe('MainLayoutComponent', () => {
  let component: MainLayoutComponent;
  let fixture: ComponentFixture<MainLayoutComponent>;
  let authServiceMock: any;
  let globalRolesSubject: BehaviorSubject<string[]>;
  let choirRolesSubject: BehaviorSubject<string[]>;
  let currentUserSubject: BehaviorSubject<any>;
  let activeChoirSubject: BehaviorSubject<any>;

  beforeEach(async () => {
    globalRolesSubject = new BehaviorSubject<string[]>(['user']);
    choirRolesSubject = new BehaviorSubject<string[]>(['singer']);
    currentUserSubject = new BehaviorSubject<any>({ roles: ['user'] });
    activeChoirSubject = new BehaviorSubject<any>({
      modules: { singerMenu: { events: false, participation: false } },
      membership: { rolesInChoir: ['singer'] }
    });
    const isAdmin$ = globalRolesSubject.asObservable().pipe(map(roles => roles.includes('admin')));
    const isChoirAdmin$ = combineLatest([isAdmin$, choirRolesSubject.asObservable()]).pipe(
      map(([isAdmin, choirRoles]) => isAdmin || choirRoles.includes('choir_admin'))
    );
    const isDirector$ = combineLatest([isAdmin$, choirRolesSubject.asObservable()]).pipe(
      map(([isAdmin, choirRoles]) => isAdmin || choirRoles.includes('director'))
    );
    const isSingerOnly$ = combineLatest([globalRolesSubject.asObservable(), choirRolesSubject.asObservable()]).pipe(
      map(([globalRoles, choirRoles]) => {
        const hasGlobalPrivilege = globalRoles.some(role => role === 'admin' || role === 'librarian');
        const hasChoirPrivilege = choirRoles.some(role => ['choir_admin', 'director', 'organist'].includes(role));
        return choirRoles.includes('singer') && !hasGlobalPrivilege && !hasChoirPrivilege;
      })
    );

    authServiceMock = {
      isLoggedIn$: of(true),
      isAdmin$,
      isLibrarian$: of(false),
      isChoirAdmin$,
      isDirector$,
      isSingerOnly$,
      globalRoles$: globalRolesSubject.asObservable(),
      choirRoles$: choirRolesSubject.asObservable(),
      currentUser$: currentUserSubject,
      activeChoir$: activeChoirSubject,
      availableChoirs$: of([]),
      setActiveChoir: () => {},
      setCurrentUser: () => {},
      logout: () => {}
    };
    const apiServiceMock = {
      getMyChoirDetails: () => of({ modules: { singerMenu: { events: false, participation: false } } })
    };
    const breakpointMock = { observe: () => of({ matches: false }) };
    const themeMock = { getCurrentTheme: () => 'light', setTheme: () => {} };
    const cartMock = { items$: of([]) };
    await TestBed.configureTestingModule({
      imports: [MainLayoutComponent, HttpClientTestingModule, RouterTestingModule],
      providers: [
        { provide: MatDialogRef, useValue: {} },
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: MatDialog, useValue: {} },
        { provide: MatSnackBar, useValue: { open: () => {} } },
        { provide: HelpService, useValue: { } },
        { provide: AuthService, useValue: authServiceMock },
        { provide: ApiService, useValue: apiServiceMock },
        { provide: BreakpointObserver, useValue: breakpointMock },
        { provide: ThemeService, useValue: themeMock },
        { provide: LoanCartService, useValue: cartMock },
        MenuVisibilityService
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MainLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('hides menu items for singers based on settings', async () => {
    const eventsItem = component.navItems.find(i => i.key === 'events');
    const participationItem = component.navItems.find(i => i.key === 'participation');
    const homeItem = component.navItems.find(i => i.key === 'dashboard');
    const eventsVisible = await firstValueFrom(eventsItem!.visibleSubject!);
    const participationVisible = await firstValueFrom(participationItem!.visibleSubject!);
    const homeVisible = await firstValueFrom(homeItem!.visibleSubject!);
    expect(eventsVisible).toBeFalse();
    expect(participationVisible).toBeFalse();
    expect(homeVisible).toBeTrue();
  });

  it('hides dienstplan by default when module setting is missing', async () => {
    const dienstplanItem = component.navItems.find(i => i.key === 'dienstplan');
    const visible = await firstValueFrom(dienstplanItem!.visibleSubject!);
    expect(visible).toBeFalse();
  });

  it('shows dienstplan for organists even if singers cannot see it', async () => {
    globalRolesSubject.next(['user']);
    choirRolesSubject.next(['singer', 'organist']);
    currentUserSubject.next({ roles: ['user'] });
    activeChoirSubject.next({
      modules: { dienstplan: true, singerMenu: { dienstplan: false } },
      membership: { rolesInChoir: ['singer', 'organist'] }
    });
    fixture.detectChanges();
    const dienstplanItem = component.navItems.find(i => i.key === 'dienstplan');
    const visible = await firstValueFrom(dienstplanItem!.visibleSubject!);
    expect(visible).toBeTrue();
  });

  it('only shows participation for privileged roles', async () => {
    globalRolesSubject.next(['user']);
    choirRolesSubject.next(['director']);
    currentUserSubject.next({ roles: ['user'] });
    activeChoirSubject.next({ modules: {}, membership: { rolesInChoir: ['director'] } });
    fixture.detectChanges();
    let item = component.navItems.find(i => i.key === 'participation');
    let visible = await firstValueFrom(item!.visibleSubject!);
    expect(visible).toBeTrue();

    globalRolesSubject.next(['user']);
    choirRolesSubject.next(['singer']);
    currentUserSubject.next({ roles: ['user'] });
    activeChoirSubject.next({ modules: {}, membership: { rolesInChoir: ['singer'] } });
    fixture.detectChanges();
    item = component.navItems.find(i => i.key === 'participation');
    visible = await firstValueFrom(item!.visibleSubject!);
    expect(visible).toBeFalse();
  });

  it('translates user roles and updates tooltip on changes', async () => {
    let role = await firstValueFrom(component.userRole$);
    expect(role).toBe('Sänger');

    globalRolesSubject.next(['user']);
    choirRolesSubject.next(['director']);
    currentUserSubject.next({ roles: ['user'] });
    activeChoirSubject.next({ modules: {}, membership: { rolesInChoir: ['director'] } });
    fixture.detectChanges();
    role = await firstValueFrom(component.userRole$);
    expect(role).toBe('Chorleiter');
  });
});
