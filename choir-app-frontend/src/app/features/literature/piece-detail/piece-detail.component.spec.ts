import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';
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
      imports: [PieceDetailComponent, HttpClientTestingModule],
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
        { provide: ApiService, useValue: { getRepertoirePiece: () => of(null), getLibraryItems: () => of([]) } },
        {
          provide: AuthService,
          useValue: { currentUser$: of(null), isAdmin$: of(false), isDemo$: of(false) }
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

  it('should show lyrics when provided', () => {
    component.piece = { id: 1, title: 'Test', lyrics: 'Line1\nLine2' } as any;
    fixture.detectChanges();
    const lyricsEl: HTMLElement | null = fixture.nativeElement.querySelector('.lyrics');
    expect(lyricsEl?.textContent).toContain('Line1');
  });
});
