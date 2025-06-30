import { TestBed } from '@angular/core/testing';

import { ThemeService } from './theme.service';
import { UserPreferencesService } from './user-preferences.service';
import { of } from 'rxjs';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: UserPreferencesService, useValue: { getPreference: () => null, update: () => of({}) } }
      ]
    });
    service = TestBed.inject(ThemeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
