import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Clipboard } from '@angular/cdk/clipboard';
import { MatSnackBar } from '@angular/material/snack-bar';
import { registerLocaleData } from '@angular/common';
import localeDe from '@angular/common/locales/de';
import localeDeExtra from '@angular/common/locales/extra/de';

import { EventCardComponent } from './event-card.component';

beforeAll(() => {
  registerLocaleData(localeDe, 'de-DE', localeDeExtra);
});

describe('EventCardComponent', () => {
  let component: EventCardComponent;
  let fixture: ComponentFixture<EventCardComponent>;
  let clipboardSpy: jasmine.SpyObj<Clipboard>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;

  beforeEach(async () => {
    clipboardSpy = jasmine.createSpyObj('Clipboard', ['copy']);
    clipboardSpy.copy.and.returnValue(true);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      imports: [EventCardComponent],
      providers: [
        { provide: Clipboard, useValue: clipboardSpy },
        { provide: MatSnackBar, useValue: snackBarSpy }
      ]
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

  it('should show notes when no pieces are present', () => {
    component.event = {
      id: 2,
      date: '2023-01-02',
      type: 'SERVICE',
      createdAt: '2023-01-02',
      updatedAt: '2023-01-02',
      notes: 'General rehearsal',
      pieces: []
    } as any;
    fixture.detectChanges();
    const noteEl = fixture.nativeElement.querySelector('.event-note');
    expect(noteEl.textContent).toContain('General rehearsal');
  });

  it('should copy formatted piece list to clipboard', () => {
    component.event = {
      id: 3,
      date: '2023-01-03',
      type: 'REHEARSAL',
      createdAt: '2023-01-03',
      updatedAt: '2023-01-03',
      pieces: [
        { id: 1, title: 'Song', composer: { name: 'Comp' }, collections: [] }
      ]
    } as any;
    component.copyPieceList();
    expect(clipboardSpy.copy).toHaveBeenCalledWith('- Song – Comp');
  });
});
