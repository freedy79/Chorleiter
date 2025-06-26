import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PieceDialog } from './piece-dialog.component';

describe('PieceDialog', () => {
  let component: PieceDialog;
  let fixture: ComponentFixture<PieceDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PieceDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PieceDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
