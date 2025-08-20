import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MatDialogContent } from '@angular/material/dialog';
import { MatStepperModule, MatStepper } from '@angular/material/stepper';
import { MaterialModule } from '@modules/material.module';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-help-wizard',
  standalone: true,
  imports: [CommonModule, MatStepperModule, MaterialModule],
  templateUrl: './help-wizard.component.html',
  styleUrls: ['./help-wizard.component.scss']
})
export class HelpWizardComponent {
  @ViewChild('content', { read: MatDialogContent }) content!: MatDialogContent;
  @ViewChild('stepper') stepper!: MatStepper;

  /**
   * Emits true when the current user has only the singer role
   * (no additional administrative roles).
   */
  isSingerOnly$: Observable<boolean>;

  constructor(
    public dialogRef: MatDialogRef<HelpWizardComponent>,
    private auth: AuthService
  ) {
    this.isSingerOnly$ = combineLatest([
      this.auth.currentUser$,
      this.auth.activeChoir$
    ]).pipe(
      map(([user]) => {
        const roles = Array.isArray(user?.roles) ? user!.roles : [];
        return (
          roles.includes('singer') &&
          !roles.some(r => ['choir_admin', 'director', 'admin', 'librarian'].includes(r))
        );
      })
    );
  }

  /**
   * Returns whether a specific menu item is visible for singers based on choir configuration.
   */
  menuVisible(key: string): Observable<boolean> {
    return combineLatest([this.isSingerOnly$, this.auth.activeChoir$]).pipe(
      map(([isSingerOnly, choir]) => {
        if (!isSingerOnly) {
          return true;
        }
        const menu = choir?.modules?.singerMenu || {};
        return menu[key] !== false;
      })
    );
  }

  close(): void {
    this.dialogRef.close();
  }
}
