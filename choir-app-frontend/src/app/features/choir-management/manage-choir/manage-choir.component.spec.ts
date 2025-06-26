import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageChoir } from './manage-choir.component';

describe('ManageChoir', () => {
  let component: ManageChoir;
  let fixture: ComponentFixture<ManageChoir>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageChoir]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageChoir);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
