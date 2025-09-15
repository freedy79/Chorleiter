import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ManageCongregationsComponent } from './manage-congregations.component';
import { of } from 'rxjs';
import { ApiService } from '@core/services/api.service';

class MockApiService {
  getCongregations() { return of([]); }
  createCongregation() { return of({}); }
  updateCongregation() { return of({}); }
  deleteCongregation() { return of({}); }
  getDistricts() { return of([]); }
}

describe('ManageCongregationsComponent', () => {
  let component: ManageCongregationsComponent;
  let fixture: ComponentFixture<ManageCongregationsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageCongregationsComponent],
      providers: [{ provide: ApiService, useClass: MockApiService }]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageCongregationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
