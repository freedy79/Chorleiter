import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageChoirComponent } from './manage-choir.component';

describe('ManageChoirComponent', () => {
  let component: ManageChoirComponent;
  let fixture: ComponentFixture<ManageChoirComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageChoirComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageChoirComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
