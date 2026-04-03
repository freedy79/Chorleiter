import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { SearchService } from '@core/services/search.service';
import { SearchBoxComponent } from './search-box.component';


describe('SearchBoxComponent', () => {
  let component: SearchBoxComponent;
  let fixture: ComponentFixture<SearchBoxComponent>;

  let searchSpy: jasmine.SpyObj<SearchService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    searchSpy = jasmine.createSpyObj('SearchService', ['searchAll', 'searchSuggestions']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    await TestBed.configureTestingModule({
      imports: [SearchBoxComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SearchService, useValue: searchSpy },
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    searchSpy.searchSuggestions.and.returnValue(of({ suggestions: [], total: 0 }));
    fixture = TestBed.createComponent(SearchBoxComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should query api on input', fakeAsync(() => {

    component.searchCtrl.setValue('abc');
    tick(300); // advance time for debounceTime
    expect(searchSpy.searchSuggestions).toHaveBeenCalledWith('abc');

  }));

  it('should navigate to results', () => {
    component.searchCtrl.setValue('term');
    component.goToResults();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/search'], { queryParams: { q: 'term' } });
  });
});
