import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';

import { EventDialogComponent } from './event-dialog.component';
import { ApiService } from '@core/services/api.service';
import { ProgramService } from '@core/services/program.service';
import { AuthService } from '@core/services/auth.service';

describe('EventDialogComponent', () => {
  let component: EventDialogComponent;
  let fixture: ComponentFixture<EventDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventDialogComponent, HttpClientTestingModule, RouterTestingModule],
      providers: [
        { provide: MatDialogRef, useValue: {} },
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: MatDialog, useValue: {} },
        { provide: MatSnackBar, useValue: { open: () => {} } },
        {
          provide: ApiService,
          useValue: {
            getRepertoireForLookup: () => of([]),
            getChoirMembers: () => of([
              { id: 99, name: 'Muster', firstName: 'Max', email: 'max@example.test', membership: { rolesInChoir: ['director'] } }
            ])
          }
        },
        {
          provide: ProgramService,
          useValue: {
            getPrograms: () => of([])
          }
        },
        {
          provide: AuthService,
          useValue: {
            currentUser$: of({ id: 99 })
          }
        }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    })
      .overrideComponent(EventDialogComponent, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(EventDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should prefill directorId with current user for new event', () => {
    expect(component.eventForm.contains('directorId')).toBeTrue();
    expect(component.eventForm.get('directorId')?.value).toBe(99);
  });

  it('should populate directorId from event data', () => {
    (component as any).populateFromEvent({
      id: 1,
      date: '2026-06-08',
      type: 'REHEARSAL',
      createdAt: '2026-06-08T00:00:00.000Z',
      updatedAt: '2026-06-08T00:00:00.000Z',
      director: { id: 42, name: 'Mustermann' },
      pieces: []
    });

    expect(component.eventForm.get('directorId')?.value).toBe(42);
  });
});
