import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { LiteratureListComponent } from './literature-list.component';

describe('LiteratureListComponent', () => {
  let component: LiteratureListComponent;
  let fixture: ComponentFixture<LiteratureListComponent>;

  beforeEach(async () => {
    LiteratureListComponent.prototype.ngAfterViewInit = () => {};
    await TestBed.configureTestingModule({
      imports: [LiteratureListComponent, HttpClientTestingModule, RouterTestingModule],
      providers: [
        { provide: MatDialogRef, useValue: {} },
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: MatDialog, useValue: {} },
        { provide: MatSnackBar, useValue: { open: () => {} } }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    })
      .overrideComponent(LiteratureListComponent, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(LiteratureListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
