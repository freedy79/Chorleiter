import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageComposersComponent } from './manage-composers.component';

describe('ManageComposersComponent', () => {
  let component: ManageComposersComponent;
  let fixture: ComponentFixture<ManageComposersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageComposersComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageComposersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
