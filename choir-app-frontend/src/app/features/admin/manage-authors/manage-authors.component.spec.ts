import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ManageAuthorsComponent } from './manage-authors.component';

describe('ManageAuthorsComponent', () => {
  let component: ManageAuthorsComponent;
  let fixture: ComponentFixture<ManageAuthorsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageAuthorsComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ManageAuthorsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
