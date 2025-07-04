import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InviteRegistrationComponent } from './invite-registration.component';
import { ApiService } from '@core/services/api.service';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

class SnackBarStub {
  open = jasmine.createSpy('open');
}

describe('InviteRegistrationComponent', () => {
  let component: InviteRegistrationComponent;
  let fixture: ComponentFixture<InviteRegistrationComponent>;
  let api: jasmine.SpyObj<ApiService>;
  let router: Router;

  beforeEach(async () => {
    api = jasmine.createSpyObj('ApiService', ['getInvitation', 'completeRegistration']);

    await TestBed.configureTestingModule({
      imports: [InviteRegistrationComponent, RouterTestingModule],
      providers: [
        { provide: ApiService, useValue: api },
        { provide: ActivatedRoute, useValue: { snapshot: { params: { token: 'abc' } } } },
        { provide: MatSnackBar, useClass: SnackBarStub }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InviteRegistrationComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load invitation details on init', () => {
    api.getInvitation.and.returnValue(of({ email: 'e@mail.com', choirName: 'Choir' }));

    component.ngOnInit();

    expect(api.getInvitation).toHaveBeenCalledWith('abc');
    expect(component.email).toBe('e@mail.com');
    expect(component.choirName).toBe('Choir');
  });

  it('should submit registration and navigate to login', () => {
    api.completeRegistration.and.returnValue(of({}));
    spyOn(router, 'navigate');

    component.token = 'abc';
    component.form.setValue({ name: 'Test', password: 'secret', isOrganist: false });

    component.submit();

    expect(api.completeRegistration).toHaveBeenCalledWith('abc', { name: 'Test', password: 'secret', isOrganist: false });
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
