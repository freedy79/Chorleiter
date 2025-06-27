import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { PieceDetailComponent } from './piece-detail.component';
import { ApiService } from '@core/services/api.service';

describe('PieceDetailComponent', () => {
  let component: PieceDetailComponent;
  let fixture: ComponentFixture<PieceDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PieceDetailComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '1' } } } },
        { provide: ApiService, useValue: { getRepertoirePiece: () => of(null) } }
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
