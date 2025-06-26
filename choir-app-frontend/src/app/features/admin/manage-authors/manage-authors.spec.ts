import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageAuthors } from './manage-authors';

describe('ManageAuthors', () => {
  let component: ManageAuthors;
  let fixture: ComponentFixture<ManageAuthors>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageAuthors]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageAuthors);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
