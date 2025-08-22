import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { HelpService } from './help.service';
import { UserService } from './user.service';
import { User } from '../models/user';

describe('HelpService', () => {
  let service: HelpService;
  const user: User = { id: 1, name: 'Test', email: 'test@example.com' };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        HelpService,
        { provide: UserService, useValue: { updateCurrentUser: () => of({}) } }
      ]
    });
    service = TestBed.inject(HelpService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should not show help again after being marked as shown', () => {
    expect(service.shouldShowHelp(user)).toBeTrue();
    service.markHelpShown(user);
    expect(service.shouldShowHelp(user)).toBeFalse();
  });
});

