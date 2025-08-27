import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HelpService } from '@core/services/help.service';
import { AuthService } from '@core/services/auth.service';
import { ApiService } from '@core/services/api.service';
import { BreakpointObserver } from '@angular/cdk/layout';
import { ThemeService } from '@core/services/theme.service';
import { LoanCartService } from '@core/services/loan-cart.service';
import { BehaviorSubject, of, firstValueFrom } from 'rxjs';

import { MainLayoutComponent } from './main-layout.component';

describe('MainLayoutComponent', () => {
  let component: MainLayoutComponent;
  let fixture: ComponentFixture<MainLayoutComponent>;
  let authServiceMock: any;

  beforeEach(async () => {
    authServiceMock = {
      isLoggedIn$: of(true),
      isAdmin$: of(false),
      currentUser$: new BehaviorSubject<any>({ roles: ['singer'] }),
      activeChoir$: new BehaviorSubject<any>({ modules: { singerMenu: { events: false } } }),
      availableChoirs$: of([]),
      setCurrentUser: () => {},
      logout: () => {}
    };
    const apiServiceMock = {
      getMyChoirDetails: () => of({ modules: { singerMenu: { events: false } } })
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
        { provide: LoanCartService, useValue: cartMock }
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
    const homeItem = component.navItems.find(i => i.key === 'dashboard');
    const eventsVisible = await firstValueFrom(eventsItem!.visibleSubject!);
    const homeVisible = await firstValueFrom(homeItem!.visibleSubject!);
    expect(eventsVisible).toBeFalse();
    expect(homeVisible).toBeTrue();
  });

  it('shows dienstplan for organists even if singers cannot see it', async () => {
    authServiceMock.currentUser$.next({ roles: ['singer', 'organist'] });
    authServiceMock.activeChoir$.next({ modules: { dienstplan: true, singerMenu: { dienstplan: false } } });
    fixture.detectChanges();
    const dienstplanItem = component.navItems.find(i => i.key === 'dienstplan');
    const visible = await firstValueFrom(dienstplanItem!.visibleSubject!);
    expect(visible).toBeTrue();
  });
});
