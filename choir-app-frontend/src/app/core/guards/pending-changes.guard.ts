import { Injectable } from '@angular/core';
import { CanDeactivate } from '@angular/router';
import { Observable } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent, ConfirmDialogData } from '@shared/components/confirm-dialog/confirm-dialog.component';

export interface PendingChanges {
  hasPendingChanges(): boolean;
  getChangedFields(): string[];
}

@Injectable({ providedIn: 'root' })
export class PendingChangesGuard implements CanDeactivate<PendingChanges> {
  constructor(private dialog: MatDialog) {}

  canDeactivate(component: PendingChanges): boolean | Observable<boolean> {
    if (component.hasPendingChanges()) {
      const fields = component.getChangedFields();
      const message = fields.length
        ? `Sie haben ungespeicherte Änderungen an folgenden Feldern: ${fields.join(', ')}. Wirklich verlassen?`
        : 'Sie haben ungespeicherte Änderungen. Wirklich verlassen?';
      const dialogData: ConfirmDialogData = {
        title: 'Änderungen verwerfen?',
        message
      };
      const dialogRef = this.dialog.open(ConfirmDialogComponent, { data: dialogData });
      return dialogRef.afterClosed();
    }
    return true;
  }
}
