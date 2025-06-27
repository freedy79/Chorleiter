import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PieceDialogComponent } from './piece-dialog.component';

describe('PieceDialogComponent', () => {
  let component: PieceDialogComponent;
  let fixture: ComponentFixture<PieceDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PieceDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PieceDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
