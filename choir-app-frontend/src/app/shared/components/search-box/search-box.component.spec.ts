import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { ApiService } from '@core/services/api.service';
import { SearchBoxComponent } from './search-box.component';


describe('SearchBoxComponent', () => {
  let component: SearchBoxComponent;
  let fixture: ComponentFixture<SearchBoxComponent>;

  let apiSpy: jasmine.SpyObj<ApiService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('ApiService', ['searchAll']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    await TestBed.configureTestingModule({
      imports: [SearchBoxComponent, HttpClientTestingModule],
      providers: [
        { provide: ApiService, useValue: apiSpy },
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    apiSpy.searchAll.and.returnValue(of({ pieces: [], events: [], collections: [] }));
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
    expect(apiSpy.searchAll).toHaveBeenCalledWith('abc');

  }));

  it('should navigate to results', () => {
    component.searchCtrl.setValue('term');
    component.goToResults();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/search'], { queryParams: { q: 'term' } });
  });
});
