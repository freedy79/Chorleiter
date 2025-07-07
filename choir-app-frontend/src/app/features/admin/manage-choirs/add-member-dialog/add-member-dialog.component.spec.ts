import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { AddMemberDialogComponent } from './add-member-dialog.component';
import { ApiService } from 'src/app/core/services/api.service';

describe('AddMemberDialogComponent', () => {
  let component: AddMemberDialogComponent;
  let fixture: ComponentFixture<AddMemberDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddMemberDialogComponent, HttpClientTestingModule, RouterTestingModule],
      providers: [
        { provide: MatDialogRef, useValue: {} },
        { provide: ApiService, useValue: { getUsers: () => ({ subscribe: () => {} }) } },
        { provide: MAT_DIALOG_DATA, useValue: [] }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AddMemberDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
