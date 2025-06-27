import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LiteratureListComponent } from './literature-list.component';

describe('LiteratureListComponent', () => {
  let component: LiteratureListComponent;
  let fixture: ComponentFixture<LiteratureListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LiteratureListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LiteratureListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
