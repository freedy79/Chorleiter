import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CollectionEdit } from './collection-edit.component';

describe('CollectionEdit', () => {
  let component: CollectionEdit;
  let fixture: ComponentFixture<CollectionEdit>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CollectionEdit]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CollectionEdit);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
