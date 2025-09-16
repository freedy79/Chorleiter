import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HelpWizardComponent } from './help-wizard.component';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from '@core/services/auth.service';
import { MenuVisibilityService } from '@core/services/menu-visibility.service';
import { BehaviorSubject, firstValueFrom, of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('HelpWizardComponent', () => {
  let component: HelpWizardComponent;
  let fixture: ComponentFixture<HelpWizardComponent>;
  let globalRolesSubject: BehaviorSubject<string[]>;
  let choirRolesSubject: BehaviorSubject<string[]>;
  let activeChoirSubject: BehaviorSubject<any>;

  beforeEach(async () => {
    globalRolesSubject = new BehaviorSubject<string[]>(['user']);
    choirRolesSubject = new BehaviorSubject<string[]>(['singer']);
    activeChoirSubject = new BehaviorSubject<any>({
      modules: { singerMenu: { events: false, participation: false } },
      membership: { rolesInChoir: ['singer'] }
    });
    const authServiceMock = {
      globalRoles$: globalRolesSubject.asObservable(),
      choirRoles$: choirRolesSubject.asObservable(),
      activeChoir$: activeChoirSubject,
      isSingerOnly$: of(true),
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

  it('shows privileged entries when singer also has a global admin role', async () => {
    globalRolesSubject.next(['admin']);
    const participationVisible = await firstValueFrom(component.menuVisible('participation'));
    expect(participationVisible).toBeTrue();
  });
});
