import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HelpWizardComponent } from './help-wizard.component';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from '@core/services/auth.service';
import { MenuVisibilityService } from '@core/services/menu-visibility.service';
import { BehaviorSubject, combineLatest, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('HelpWizardComponent', () => {
  let component: HelpWizardComponent;
  let fixture: ComponentFixture<HelpWizardComponent>;

  beforeEach(async () => {
    const globalRolesSubject = new BehaviorSubject<string[]>(['user']);
    const choirRolesSubject = new BehaviorSubject<string[]>(['singer']);
    const activeChoirSubject = new BehaviorSubject<any>({ modules: { singerMenu: { events: false, participation: false } } });
    const isSingerOnly$ = combineLatest([globalRolesSubject.asObservable(), choirRolesSubject.asObservable()]).pipe(
      map(([globalRoles, choirRoles]) => {
        const hasGlobalPrivilege = globalRoles.some(role => role === 'admin' || role === 'librarian');
        const hasChoirPrivilege = choirRoles.some(role => ['choir_admin', 'director', 'organist'].includes(role));
        return choirRoles.includes('singer') && !hasGlobalPrivilege && !hasChoirPrivilege;
      })
    );
    const authServiceMock = {
      globalRoles$: globalRolesSubject.asObservable(),
      choirRoles$: choirRolesSubject.asObservable(),
      activeChoir$: activeChoirSubject,
      isSingerOnly$,
      isAdmin$: of(false),
      isChoirAdmin$: of(false),
      isDirector$: of(false),
      isLibrarian$: of(false)
    };

    await TestBed.configureTestingModule({
      imports: [HelpWizardComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: {} },
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: AuthService, useValue: authServiceMock },
        MenuVisibilityService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HelpWizardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('hides menu items disabled for singers', (done) => {
    component.menuVisible('events').subscribe(visible => {
      expect(visible).toBeFalse();
      component.menuVisible('participation').subscribe(pVisible => {
        expect(pVisible).toBeFalse();
        done();
      });
    });
  });
});
