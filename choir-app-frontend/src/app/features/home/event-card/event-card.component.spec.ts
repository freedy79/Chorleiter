import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EventCardComponent } from './event-card.component';

describe('EventCardComponent', () => {
  let component: EventCardComponent;
  let fixture: ComponentFixture<EventCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventCardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EventCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the director name if provided', () => {
    component.event = {
      id: 1,
      date: '2023-01-01',
      type: 'SERVICE',
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01',
      director: { name: 'Alice' },
      pieces: []
    } as any;
    fixture.detectChanges();
    const h3 = fixture.nativeElement.querySelector('h3');
    expect(h3.textContent).toContain('(Alice)');
  });
});
