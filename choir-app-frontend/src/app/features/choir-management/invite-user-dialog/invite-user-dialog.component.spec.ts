import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InviteUserDialog } from './invite-user-dialog.component';

describe('InviteUserDialog', () => {
  let component: InviteUserDialog;
  let fixture: ComponentFixture<InviteUserDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InviteUserDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InviteUserDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
