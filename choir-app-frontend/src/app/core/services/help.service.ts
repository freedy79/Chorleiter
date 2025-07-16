import { Injectable } from '@angular/core';
import { User } from '../models/user';
import { UserPreferencesService } from './user-preferences.service';

@Injectable({ providedIn: 'root' })
export class HelpService {
  constructor(private prefs: UserPreferencesService) {}

  shouldShowHelp(user: User | null): boolean {
    if (!user) return false;
    if (user.role === 'demo' && !this.prefs.getPreference('helpShown')) {
      return true;
    }
    return !this.prefs.getPreference('helpShown');
  }

  markHelpShown(user: User | null): void {
    if (!user) return;
    this.prefs.update({ helpShown: true }).subscribe();
  }
}
