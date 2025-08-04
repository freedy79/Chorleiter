import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { PieceDetailComponent } from './piece-detail.component';
import { ApiService } from '@core/services/api.service';
import { AuthService } from '@core/services/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

describe('PieceDetailComponent', () => {
  let component: PieceDetailComponent;
  let fixture: ComponentFixture<PieceDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PieceDetailComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: () => '1' },
              queryParamMap: { get: () => null }
            }
          }
        },
        { provide: ApiService, useValue: { getRepertoirePiece: () => of(null) } },
        {
          provide: AuthService,
          useValue: { currentUser$: of(null), isAdmin$: of(false) }
        },
        { provide: MatDialog, useValue: { open: () => ({ afterClosed: () => of(false) }) } },
        { provide: MatSnackBar, useValue: { open: () => {} } }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PieceDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
