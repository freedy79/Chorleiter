import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { SearchService } from '@core/services/search.service';
import { SearchResultsComponent } from './search-results.component';

describe('SearchResultsComponent', () => {
  let component: SearchResultsComponent;
  let fixture: ComponentFixture<SearchResultsComponent>;
  let searchSpy: jasmine.SpyObj<SearchService>;

  beforeEach(async () => {
    searchSpy = jasmine.createSpyObj('SearchService', ['searchAll']);
    await TestBed.configureTestingModule({
      imports: [SearchResultsComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { queryParamMap: of({ get: () => 'x' }) } },
        { provide: SearchService, useValue: searchSpy }
      ]
    }).compileComponents();

    searchSpy.searchAll.and.returnValue(of({ pieces: [], events: [], collections: [] }));
    fixture = TestBed.createComponent(SearchResultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
