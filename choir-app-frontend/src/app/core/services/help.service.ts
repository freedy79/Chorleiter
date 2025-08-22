import { Injectable } from '@angular/core';
import { User } from '../models/user';
import { UserService } from './user.service';

@Injectable({ providedIn: 'root' })
export class HelpService {
  constructor(private users: UserService) {}

  shouldShowHelp(user: User | null): boolean {
    if (!user) {
      return false;
    }
    if (user.roles?.includes('demo')) {
      return true;
    }
    return !user.helpShown;
  }

  markHelpShown(user: User | null): void {
    if (!user || user.roles?.includes('demo')) {
      return;
    }
    this.users.updateCurrentUser({ helpShown: true }).subscribe(() => {
      user.helpShown = true;
    });
  }
}
