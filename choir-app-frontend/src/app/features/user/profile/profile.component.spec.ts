import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { ApiService } from '@core/services/api.service';

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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileComponent, HttpClientTestingModule, RouterTestingModule],
      providers: [
        { provide: MatDialogRef, useValue: {} },
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: MatDialog, useValue: {} },
        { provide: MatSnackBar, useValue: { open: () => {} } },
        { provide: ApiService, useClass: MockApiService }
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
});
