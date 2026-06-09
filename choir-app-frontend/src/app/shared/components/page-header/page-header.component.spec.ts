import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { PageHeaderComponent } from './page-header.component';

describe('PageHeaderComponent', () => {
  let component: PageHeaderComponent;
  let fixture: ComponentFixture<PageHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PageHeaderComponent, RouterTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(PageHeaderComponent);
    component = fixture.componentInstance;
  });

  it('renders breadcrumb navigation when breadcrumbs are provided', () => {
    component.title = 'Sammlung bearbeiten';
    component.breadcrumbs = [
      { label: 'Home', route: '/dashboard' },
      { label: 'Sammlungen', route: '/collections' },
      { label: 'Sammlung bearbeiten' }
    ];
    fixture.detectChanges();

    const breadcrumbNav = fixture.nativeElement.querySelector('nav[aria-label="Breadcrumb"]');
    const breadcrumbLinks = fixture.nativeElement.querySelectorAll('.breadcrumbs a');
    const breadcrumbTail = fixture.nativeElement.querySelector('.breadcrumbs li:last-child span');

    expect(breadcrumbNav).toBeTruthy();
    expect(breadcrumbLinks.length).toBe(2);
    expect(breadcrumbTail?.textContent).toContain('Sammlung bearbeiten');
  });

  it('hides breadcrumb navigation when no breadcrumbs are provided', () => {
    component.title = 'Profil';
    component.breadcrumbs = [];
    fixture.detectChanges();

    const breadcrumbNav = fixture.nativeElement.querySelector('nav[aria-label="Breadcrumb"]');
    expect(breadcrumbNav).toBeNull();
  });
});
