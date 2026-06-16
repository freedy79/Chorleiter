import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { HelpService } from './help.service';
import { UserService } from './user.service';
import { User } from '../models/user';

describe('HelpService', () => {
  let service: HelpService;
  const user: User = { id: 1, name: 'Test', email: 'test@example.com' };
  const demoUser: User = { id: 2, name: 'Demo', email: 'demo@example.com', roles: ['demo'] };

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

  it('should show help for demo user only once per browser storage', () => {
    expect(service.shouldShowHelp(demoUser)).toBeTrue();
    service.markHelpShown(demoUser);
    expect(service.shouldShowHelp(demoUser)).toBeFalse();
  });

  it('should remember demo help state across service instances', () => {
    service.markHelpShown(demoUser);

    const newInstance = TestBed.inject(HelpService);
    expect(newInstance.shouldShowHelp(demoUser)).toBeFalse();
  });
});
