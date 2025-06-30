import { TestBed } from '@angular/core/testing';

import { ThemeService } from './theme.service';
import { UserPreferencesService } from './user-preferences.service';
import { of } from 'rxjs';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    localStorage.clear();
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

  it('should load theme from localStorage on init', () => {
    localStorage.setItem('theme', 'dark');
    service.initializeTheme();
    expect(service.getCurrentTheme()).toBe('dark');
  });
});
