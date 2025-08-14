import { Injectable } from '@angular/core';

/**
 * State information for a paginated list view.
 */
export interface ListViewState {
  page: number;
  selectedId: number | null;
}

/**
 * Service to persist and restore list view state using the browser History API
 * and sessionStorage. It centralises calls to `pushState`, `replaceState` and
 * the `popstate` event so components can focus on their own logic.
 */
@Injectable({ providedIn: 'root' })
export class NavigationStateService {
  /**
   * Store the given state under a key. The state is written to sessionStorage
   * and attached to the current history entry via `replaceState`.
   */
  saveState(key: string, state: ListViewState): void {
    sessionStorage.setItem(key, JSON.stringify(state));
    // merge existing state to avoid overriding unrelated data
    const current = history.state || {};
    history.replaceState({ ...current, [key]: state }, document.title);
  }

  /**
   * Retrieve a previously stored state. History state has precedence over
   * sessionStorage so that the Back button can restore the last view.
   */
  getState(key: string): ListViewState | null {
    const historyState = (history.state || {})[key];
    if (historyState) return historyState as ListViewState;
    const stored = sessionStorage.getItem(key);
    return stored ? JSON.parse(stored) as ListViewState : null;
  }

  /**
   * Register a callback for the browser `popstate` event. Useful when a
   * component wants to react immediately to History navigation without being
   * recreated by the router.
   */
  onPopState(key: string, cb: (state: ListViewState) => void): void {
    window.addEventListener('popstate', (event: PopStateEvent) => {
      const state = (event.state || {})[key] || this.getState(key);
      if (state) cb(state);
    });
  }

  /**
   * Push a neutral history entry. Components can use this before navigation to
   * a detail page to ensure the current list state remains in the history
   * stack.
   */
  pushPlaceholderState(data: any = {}): void {
    history.pushState(data, document.title);
  }
}
