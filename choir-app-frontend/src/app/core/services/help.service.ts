import { Injectable } from '@angular/core';
import { User } from '../models/user';

const PREFIX = 'help-shown-';

@Injectable({ providedIn: 'root' })
export class HelpService {
  shouldShowHelp(user: User | null): boolean {
    if (!user) return false;
    if (user.role === 'demo') {
      return !sessionStorage.getItem(PREFIX + 'demo');
    }
    return !localStorage.getItem(PREFIX + user.id);
  }

  markHelpShown(user: User | null): void {
    if (!user) return;
    if (user.role === 'demo') {
      sessionStorage.setItem(PREFIX + 'demo', 'true');
    } else {
      localStorage.setItem(PREFIX + user.id, 'true');
    }
  }
}
