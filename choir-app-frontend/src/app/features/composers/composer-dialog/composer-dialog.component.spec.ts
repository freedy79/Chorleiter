import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ComposerDialogComponent } from './composer-dialog.component';

describe('ComposerDialogComponent', () => {
  let component: ComposerDialogComponent;
  let fixture: ComponentFixture<ComposerDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComposerDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ComposerDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
