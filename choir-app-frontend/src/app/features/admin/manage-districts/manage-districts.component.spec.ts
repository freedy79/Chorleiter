import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ManageDistrictsComponent } from './manage-districts.component';
import { of } from 'rxjs';
import { ApiService } from '@core/services/api.service';

class MockApiService {
  getDistricts() { return of([]); }
  createDistrict() { return of({}); }
  deleteDistrict() { return of({}); }
}

describe('ManageDistrictsComponent', () => {
  let component: ManageDistrictsComponent;
  let fixture: ComponentFixture<ManageDistrictsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageDistrictsComponent],
      providers: [{ provide: ApiService, useClass: MockApiService }]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageDistrictsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
