import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, of } from 'rxjs';
import { ApiService } from '@core/services/api.service';
import { AuthService } from '@core/services/auth.service';

import { ProfileComponent } from './profile.component';

class MockApiService {
  getCurrentUser() {
    return of({ id: 1, firstName: 'Admin', name: 'User', email: 'admin@example.com', roles: ['admin'] });
  }
  updateCurrentUser() { return of({}); }
  getDistricts() { return of([]); }
  getCongregations() { return of([]); }
}

describe('ProfileComponent', () => {
  let component: ProfileComponent;
  let fixture: ComponentFixture<ProfileComponent>;
  let demoSubject: BehaviorSubject<boolean>;
  let authServiceMock: any;

  beforeEach(async () => {
    demoSubject = new BehaviorSubject<boolean>(false);
    authServiceMock = {
      availableChoirs$: of([{ id: 1, name: 'Demo Choir' }]),
      isDemo$: demoSubject.asObservable(),
      logout: () => {},
      setCurrentUser: () => {}
    };
    await TestBed.configureTestingModule({
      imports: [ProfileComponent, HttpClientTestingModule, RouterTestingModule],
      providers: [
        { provide: MatDialogRef, useValue: {} },
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: MatDialog, useValue: {} },
        { provide: MatSnackBar, useValue: { open: () => {} } },
        { provide: ApiService, useClass: MockApiService },
        { provide: AuthService, useValue: authServiceMock }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should enable roles control for admin users', () => {
    component.currentUser = { id: 1, firstName: 'Admin', name: 'User', email: 'admin@example.com', roles: ['admin'] } as any;
    component.isLoading = false;
    fixture.detectChanges();
    expect(component.profileForm.get('roles')?.enabled).toBeTrue();
  });

  it('disables editing actions for demo users', () => {
    demoSubject.next(true);
    fixture.detectChanges();
    const warnButtons = fixture.nativeElement.querySelectorAll('button[color="warn"]');
    warnButtons.forEach((btn: HTMLButtonElement) => expect(btn.disabled).toBeTrue());
    const saveButton = fixture.nativeElement.querySelector('.actions-footer button');
    expect(saveButton).toBeNull();
  });
});
