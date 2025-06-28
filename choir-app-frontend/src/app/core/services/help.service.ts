import { Injectable } from '@angular/core';
import { User } from '../models/user';

const PREFIX = 'help-shown-';

@Injectable({ providedIn: 'root' })
export class HelpService {
  shouldShowHelp(user: User | null): boolean {
    if (!user) return false;
    if (user.role === 'demo') return true;
    return !localStorage.getItem(PREFIX + user.id);
  }

  markHelpShown(user: User | null): void {
    if (!user || user.role === 'demo') return;
    localStorage.setItem(PREFIX + user.id, 'true');
  }
}
