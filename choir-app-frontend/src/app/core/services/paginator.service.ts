import { Injectable } from '@angular/core';
import { UserPreferencesService } from './user-preferences.service';

@Injectable({
  providedIn: 'root'
})
export class PaginatorService {
  constructor(private prefs: UserPreferencesService) {}

  getPageSize(key: string, defaultSize: number): number {
    const map = this.prefs.getPreference('pageSizes') || {};
    const val = map[key];
    return val ? val : defaultSize;
  }

  setPageSize(key: string, size: number): void {
    const map = { ...(this.prefs.getPreference('pageSizes') || {}) };
    map[key] = size;
    this.prefs.update({ pageSizes: map }).subscribe();
  }
}
