import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
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
    searchSpy = jasmine.createSpyObj('SearchService', ['searchAll']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    await TestBed.configureTestingModule({
      imports: [SearchBoxComponent, HttpClientTestingModule],
      providers: [
        { provide: SearchService, useValue: searchSpy },
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    searchSpy.searchAll.and.returnValue(of({ pieces: [], events: [], collections: [] }));
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
    expect(searchSpy.searchAll).toHaveBeenCalledWith('abc');

  }));

  it('should navigate to results', () => {
    component.searchCtrl.setValue('term');
    component.goToResults();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/search'], { queryParams: { q: 'term' } });
  });
});
