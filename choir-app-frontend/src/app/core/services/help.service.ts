import { Injectable } from '@angular/core';
import { User } from '../models/user';
import { UserPreferencesService } from './user-preferences.service';

const PREFIX = 'help-shown-';

@Injectable({ providedIn: 'root' })
export class HelpService {
  constructor(private prefs: UserPreferencesService) {}

  shouldShowHelp(user: User | null): boolean {
    if (!user) return false;
    if (user.role === 'demo') {
      return !sessionStorage.getItem(PREFIX + 'demo');
    }
    return !this.prefs.getPreference('helpShown');
  }

  markHelpShown(user: User | null): void {
    if (!user) return;
    if (user.role === 'demo') {
      sessionStorage.setItem(PREFIX + 'demo', 'true');
    } else {
      this.prefs.update({ helpShown: true }).subscribe();
    }
  }
}
