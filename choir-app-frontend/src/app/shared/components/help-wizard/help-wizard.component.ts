import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MatDialogContent } from '@angular/material/dialog';
import { MatStepperModule, MatStepper } from '@angular/material/stepper';
import { MaterialModule } from '@modules/material.module';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from '@core/services/auth.service';
import { MenuVisibilityService } from '@core/services/menu-visibility.service';

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
    private auth: AuthService,
    private menu: MenuVisibilityService
  ) {
    this.isSingerOnly$ = combineLatest([
      this.auth.activeChoir$,
      this.auth.isAdmin$,
      this.auth.isLibrarian$
    ]).pipe(
      map(([choir, isAdmin, isLibrarian]) => {
        if (isAdmin || isLibrarian) {
          return false;
        }
        const roles = choir?.membership?.rolesInChoir ?? [];
        if (!roles.includes('singer')) {
          return false;
        }
        const privileged = ['choir_admin', 'choirleiter', 'director', 'organist'];
        return !roles.some(role => privileged.includes(role));
      })
    );
  }

  /**
   * Returns whether a specific menu item is visible for singers based on choir configuration.
   */
  menuVisible(key: string): Observable<boolean> {
    return this.menu.isVisible(key);
  }

  close(): void {
    this.dialogRef.close();
  }
}
