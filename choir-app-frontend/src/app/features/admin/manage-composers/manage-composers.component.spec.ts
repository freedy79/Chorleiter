import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageComposers } from './manage-composers.component';

describe('ManageComposers', () => {
  let component: ManageComposers;
  let fixture: ComponentFixture<ManageComposers>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageComposers]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageComposers);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
