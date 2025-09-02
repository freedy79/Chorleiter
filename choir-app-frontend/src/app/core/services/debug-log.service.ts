import { Injectable } from '@angular/core';

const STORAGE_KEY = 'debug-logs-enabled';

@Injectable({ providedIn: 'root' })
export class DebugLogService {
  private enabled = localStorage.getItem(STORAGE_KEY) === 'true';

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(value: boolean): void {
    this.enabled = value;
    localStorage.setItem(STORAGE_KEY, String(value));
  }

  log(...args: unknown[]): void {
    if (this.enabled) {
      // eslint-disable-next-line no-console
      console.debug(...args);
    }
  }
}
