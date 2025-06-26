import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ComposerDialog } from './composer-dialog.component';

describe('ComposerDialog', () => {
  let component: ComposerDialog;
  let fixture: ComponentFixture<ComposerDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComposerDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ComposerDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
