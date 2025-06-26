import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CategoryDialog } from './category-dialog.component';

describe('CategoryDialog', () => {
  let component: CategoryDialog;
  let fixture: ComponentFixture<CategoryDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CategoryDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
