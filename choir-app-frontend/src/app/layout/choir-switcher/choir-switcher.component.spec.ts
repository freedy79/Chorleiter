import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChoirSwitcherComponent } from './choir-switcher.component';

describe('ChoirSwitcherComponent', () => {
  let component: ChoirSwitcherComponent;
  let fixture: ComponentFixture<ChoirSwitcherComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChoirSwitcherComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChoirSwitcherComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
