import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { ApiService } from '@core/services/api.service';
import { SearchResultsComponent } from './search-results.component';

describe('SearchResultsComponent', () => {
  let component: SearchResultsComponent;
  let fixture: ComponentFixture<SearchResultsComponent>;
  let apiSpy: jasmine.SpyObj<ApiService>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('ApiService', ['searchAll']);
    await TestBed.configureTestingModule({
      imports: [SearchResultsComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { queryParamMap: of({ get: () => 'x' }) } },
        { provide: ApiService, useValue: apiSpy }
      ]
    }).compileComponents();

    apiSpy.searchAll.and.returnValue(of({ pieces: [], events: [], collections: [] }));
    fixture = TestBed.createComponent(SearchResultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
