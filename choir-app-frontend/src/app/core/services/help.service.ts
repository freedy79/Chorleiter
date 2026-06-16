import { Injectable } from '@angular/core';
import { User } from '../models/user';
import { UserService } from './user.service';

@Injectable({ providedIn: 'root' })
export class HelpService {
  private readonly demoHelpShownKey = 'demo_help_shown';

  constructor(private users: UserService) {}

  shouldShowHelp(user: User | null): boolean {
    if (!user) {
      return false;
    }
    if (user.roles?.includes('demo')) {
      return localStorage.getItem(this.demoHelpShownKey) !== 'true';
    }
    return !user.helpShown;
  }

  markHelpShown(user: User | null): void {
    if (!user) {
      return;
    }

    if (user.roles?.includes('demo')) {
      localStorage.setItem(this.demoHelpShownKey, 'true');
      return;
    }

    this.users.updateCurrentUser({ helpShown: true }).subscribe(() => {
      user.helpShown = true;
    });
  }
}
