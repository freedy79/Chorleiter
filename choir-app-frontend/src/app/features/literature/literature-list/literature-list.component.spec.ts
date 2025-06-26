import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LiteratureList } from './literature-list';

describe('LiteratureList', () => {
  let component: LiteratureList;
  let fixture: ComponentFixture<LiteratureList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LiteratureList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LiteratureList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
