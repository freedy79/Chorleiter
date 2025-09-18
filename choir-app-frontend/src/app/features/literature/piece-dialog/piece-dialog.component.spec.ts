import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthService } from '@core/services/auth.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { PieceDialogComponent } from './piece-dialog.component';

describe('PieceDialogComponent', () => {
  let component: PieceDialogComponent;
  let fixture: ComponentFixture<PieceDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PieceDialogComponent, HttpClientTestingModule, RouterTestingModule],
      providers: [
        { provide: AuthService, useValue: { isAdmin$: of(true), isDemo$: of(false) } },
        { provide: MatDialogRef, useValue: {} },
        { provide: MAT_DIALOG_DATA, useValue: { pieceId: null, initialTitle: 'Test Title' } },
        { provide: MatDialog, useValue: {} },
        { provide: MatSnackBar, useValue: { open: () => {} } }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PieceDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should prefill title when initialTitle is provided', () => {
    expect(component.pieceForm.get('title')?.value).toBe('Test Title');
  });
});
