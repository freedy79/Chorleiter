import { Injectable } from '@angular/core';
import { CanDeactivate } from '@angular/router';
import { Observable } from 'rxjs';

export interface PendingChanges {
  hasPendingChanges(): boolean;
}

@Injectable({ providedIn: 'root' })
export class PendingChangesGuard implements CanDeactivate<PendingChanges> {
  canDeactivate(component: PendingChanges): boolean | Observable<boolean> {
    if (component.hasPendingChanges()) {
      return confirm('Sie haben ungespeicherte Änderungen. Wirklich verlassen?');
    }
    return true;
  }
}
