import { Injectable } from '@angular/core';
import { User } from '../models/user';
import { UserPreferencesService } from './user-preferences.service';

@Injectable({ providedIn: 'root' })
export class HelpService {
  constructor(private prefs: UserPreferencesService) {}

  shouldShowHelp(user: User | null): boolean {
    if (!user) {
      return false;
    }
    if (user.roles?.includes('demo')) {
      return true;
    }
    const storageKey = `helpShown_${user.id}`;
    if (localStorage.getItem(storageKey) === 'true') {
      return false;
    }
    return !this.prefs.getPreference('helpShown');
  }

  markHelpShown(user: User | null): void {
    if (!user || user.roles?.includes('demo')) {
      return;
    }
    const storageKey = `helpShown_${user.id}`;
    localStorage.setItem(storageKey, 'true');
    this.prefs.update({ helpShown: true }).subscribe();
  }
}
