import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { PieceService } from '@core/services/piece.service';
import { PaginatorService } from '@core/services/paginator.service';
import { CollectionPieceListComponent } from './collection-piece-list.component';

class MockPaginatorService {
  getPageSize() { return 10; }
  setPageSize() {}
}

describe('CollectionPieceListComponent', () => {
  let component: CollectionPieceListComponent;
  let fixture: ComponentFixture<CollectionPieceListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CollectionPieceListComponent, RouterTestingModule],
      providers: [
        { provide: PieceService, useValue: { getGlobalPieces: () => of([]) } },
        { provide: PaginatorService, useClass: MockPaginatorService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CollectionPieceListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
