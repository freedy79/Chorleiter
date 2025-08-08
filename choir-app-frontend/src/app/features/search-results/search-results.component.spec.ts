import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { SearchService } from '@core/services/search.service';
import { SearchResultsComponent } from './search-results.component';

describe('SearchResultsComponent', () => {
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
  });

  function createComponent() {
    const fixture: ComponentFixture<SearchResultsComponent> = TestBed.createComponent(SearchResultsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    return { fixture, component };
  }

  it('should create', () => {
    searchSpy.searchAll.and.returnValue(of({ pieces: [], events: [], collections: [] }));
    const { component } = createComponent();
    expect(component).toBeTruthy();
  });

  it('should render collection results as links', () => {
    searchSpy.searchAll.and.returnValue(of({ pieces: [], events: [], collections: [{ id: 1, title: 'Test' }] }));
    const { fixture } = createComponent();
    const link: HTMLAnchorElement | null = fixture.nativeElement.querySelector('section:last-child ul li a');
    expect(link).not.toBeNull();
    expect(link?.getAttribute('ng-reflect-router-link')).toContain('/collections/edit,1');
  });
});
