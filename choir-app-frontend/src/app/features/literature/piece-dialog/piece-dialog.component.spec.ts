import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthService } from '@core/services/auth.service';

import { PieceDialogComponent } from './piece-dialog.component';

describe('PieceDialogComponent', () => {
  let component: PieceDialogComponent;
  let fixture: ComponentFixture<PieceDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PieceDialogComponent],
      providers: [{ provide: AuthService, useValue: { isAdmin$: of(true) } }]
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
