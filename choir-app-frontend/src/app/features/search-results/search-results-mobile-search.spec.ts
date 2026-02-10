import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { SearchService } from '@core/services/search.service';
import { SearchResultsComponent } from './search-results.component';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

describe('SearchResultsComponent - Mobile Search Page', () => {
  let searchSpy: jasmine.SpyObj<SearchService>;
  let activatedRouteMock: any;

  beforeEach(async () => {
    searchSpy = jasmine.createSpyObj('SearchService', ['searchAll']);
    activatedRouteMock = {
      queryParamMap: of(new Map([['q', 'test query']]))
    };

    await TestBed.configureTestingModule({
      imports: [SearchResultsComponent],
      providers: [
        { provide: ActivatedRoute, useValue: activatedRouteMock },
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

  it('should render search box component at the top', () => {
    searchSpy.searchAll.and.returnValue(of({ pieces: [], events: [], collections: [] }));
    const { fixture } = createComponent();
    const searchBox = fixture.debugElement.query(By.css('app-search-box'));
    expect(searchBox).toBeTruthy();
  });

  it('should render search box with class "search"', () => {
    searchSpy.searchAll.and.returnValue(of({ pieces: [], events: [], collections: [] }));
    const { fixture } = createComponent();
    const searchBox = fixture.debugElement.query(By.css('app-search-box.search'));
    expect(searchBox).toBeTruthy();
  });

  it('should show query in heading when query parameter exists', () => {
    searchSpy.searchAll.and.returnValue(of({ pieces: [], events: [], collections: [] }));
    const { fixture, component } = createComponent();

    // Manually set the query (simulating ngOnInit subscription)
    component.query = 'test query';
    fixture.detectChanges();

    const heading = fixture.debugElement.query(By.css('h2'));
    expect(heading).toBeTruthy();
    expect(heading.nativeElement.textContent).toContain('test query');
  });

  it('should show empty state message when no query parameter', () => {
    // Mock empty query param
    activatedRouteMock.queryParamMap = of(new Map());
    searchSpy.searchAll.and.returnValue(of({ pieces: [], events: [], collections: [] }));

    const { fixture, component } = createComponent();
    component.query = '';
    fixture.detectChanges();

    const emptyMessage = fixture.debugElement.query(By.css('p'));
    expect(emptyMessage).toBeTruthy();
    expect(emptyMessage.nativeElement.textContent).toContain('Suchbegriff');
  });

  it('should fetch search results when query changes', () => {
    searchSpy.searchAll.and.returnValue(of({
      pieces: [],
      events: [],
      collections: []
    }));

    const { component } = createComponent();
    expect(searchSpy.searchAll).toHaveBeenCalled();
  });

  it('should render piece results when available', () => {
    const mockResults: any = {
      pieces: [
        {
          id: 1,
          title: 'Test Piece',
          composer: { name: 'John Composer' },
          collections: [],
          choir_repertoire: null
        }
      ],
      events: [],
      collections: []
    };

    searchSpy.searchAll.and.returnValue(of(mockResults));
    const { fixture } = createComponent();
    fixture.detectChanges();

    const pieceSection = fixture.debugElement.query(By.css('section h3'));
    expect(pieceSection?.nativeElement.textContent).toContain('Stücke');

    const pieceLink = fixture.debugElement.query(By.css('section ul li a'));
    expect(pieceLink).toBeTruthy();
    expect(pieceLink.nativeElement.textContent).toContain('Test Piece');
  });

  it('should render collection results as links', () => {
    const mockResults: any = {
      pieces: [],
      events: [],
      collections: [{ id: 1, title: 'Test Collection', subtitle: null }]
    };

    searchSpy.searchAll.and.returnValue(of(mockResults));
    const { fixture } = createComponent();
    fixture.detectChanges();

    const collectionSection = fixture.debugElement.queryAll(By.css('section h3')).pop();
    expect(collectionSection?.nativeElement.textContent).toContain('Sammlungen');

    const collectionLink = fixture.debugElement.queryAll(By.css('section ul li a')).pop();
    expect(collectionLink).toBeTruthy();
    expect(collectionLink!.nativeElement.getAttribute('ng-reflect-router-link')).toContain('/collections/edit');
  });

  it('should display collection subtitle if available', () => {
    const mockResults: any = {
      pieces: [],
      events: [],
      collections: [{ id: 1, title: 'Main Title', subtitle: 'Sub Title' }]
    };

    searchSpy.searchAll.and.returnValue(of(mockResults));
    const { fixture } = createComponent();
    fixture.detectChanges();

    const collectionLink = fixture.debugElement.queryAll(By.css('section ul li a')).pop();
    expect(collectionLink!.nativeElement.textContent).toContain('Main Title');
    expect(collectionLink!.nativeElement.textContent).toContain('Sub Title');
  });

  it('should display composer info or origin for pieces', () => {
    const mockResults: any = {
      pieces: [
        {
          id: 1,
          title: 'Test Piece',
          composer: { name: 'Bach' },
          origin: null,
          collections: [],
          choir_repertoire: null
        }
      ],
      events: [],
      collections: []
    };

    searchSpy.searchAll.and.returnValue(of(mockResults));
    const { fixture } = createComponent();
    fixture.detectChanges();

    const pieceDiv = fixture.debugElement.query(By.css('section ul li div'));
    expect(pieceDiv.nativeElement.textContent).toContain('Bach');
  });
});
