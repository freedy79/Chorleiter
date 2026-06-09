import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';

import { DonationsComponent } from './donations.component';
import { ApiService } from '@core/services/api.service';
import { AdminService } from '@core/services/admin.service';

describe('DonationsComponent', () => {
  let component: DonationsComponent;
  let fixture: ComponentFixture<DonationsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DonationsComponent, NoopAnimationsModule],
      providers: [
        {
          provide: ApiService,
          useValue: {
            getDonations: () => of([])
          }
        },
        {
          provide: AdminService,
          useValue: {
            getUsers: () => of([]),
            createDonation: () => of({})
          }
        },
        {
          provide: MatDialog,
          useValue: {
            open: () => ({ afterClosed: () => of(null) })
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DonationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('uses css classes instead of inline style attributes in template', () => {
    component.isAddingDonation = true;
    fixture.detectChanges();

    const header = fixture.nativeElement.querySelector('.donations-header') as HTMLElement;
    const grid = fixture.nativeElement.querySelector('.donation-form-grid') as HTMLElement;
    const table = fixture.nativeElement.querySelector('.donations-table') as HTMLElement;

    expect(header).toBeTruthy();
    expect(grid).toBeTruthy();
    expect(table).toBeTruthy();

    expect(header.getAttribute('style')).toBeNull();
    expect(grid.getAttribute('style')).toBeNull();
    expect(table.getAttribute('style')).toBeNull();
  });
});
