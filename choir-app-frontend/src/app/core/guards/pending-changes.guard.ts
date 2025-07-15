import { Injectable } from '@angular/core';
import { CanDeactivate } from '@angular/router';
import { Observable } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent, ConfirmDialogData } from '@shared/components/confirm-dialog/confirm-dialog.component';

export interface PendingChanges {
  hasPendingChanges(): boolean;
}

@Injectable({ providedIn: 'root' })
export class PendingChangesGuard implements CanDeactivate<PendingChanges> {
  constructor(private dialog: MatDialog) {}

  canDeactivate(component: PendingChanges): boolean | Observable<boolean> {
    if (component.hasPendingChanges()) {
      const dialogData: ConfirmDialogData = {
        title: 'Änderungen verwerfen?',
        message: 'Sie haben ungespeicherte Änderungen. Wirklich verlassen?'
      };
      const dialogRef = this.dialog.open(ConfirmDialogComponent, { data: dialogData });
      return dialogRef.afterClosed();
    }
    return true;
  }
}
