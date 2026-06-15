import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router'; // Wichtig für routerLink
import { MatDialog } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { buildInfo } from '@env/build-info';
import { AuthService } from '@core/services/auth.service';
import { ImprovementSuggestionDialogComponent } from '@shared/components/improvement-suggestion-dialog/improvement-suggestion-dialog.component';
import { RecommendDialogComponent } from '@features/referrals/recommend-dialog/recommend-dialog.component';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule, MaterialModule],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent {
    public readonly currentYear: number = new Date().getFullYear();
    public readonly buildDate: string = buildInfo.date;
    public successMessage: string | null = null;
    private successMessageTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(
      private dialog: MatDialog,
      private authService: AuthService
    ) {}

    openRecommendDialog(): void {
      const activeChoir = this.authService.activeChoir$.value;
      const allowSingerRegistration = !!activeChoir?.modules?.joinByLink;

      const dialogRef = this.dialog.open(RecommendDialogComponent, {
        width: '640px',
        maxWidth: '95vw',
        autoFocus: 'first-tabbable',
        data: { allowSingerRegistration }
      });

      dialogRef.afterClosed().subscribe((result) => {
        if (result === true) {
          this.showSuccessMessage('Danke! Die Empfehlung wurde versendet.');
        }
      });
    }

    openImprovementSuggestionDialog(): void {
      const dialogRef = this.dialog.open(ImprovementSuggestionDialogComponent, {
        width: '640px',
        maxWidth: '95vw',
        autoFocus: 'first-tabbable'
      });

      dialogRef.afterClosed().subscribe((result) => {
        if (result === true) {
          this.showSuccessMessage('Danke! Dein Vorschlag wurde versendet.');
        }
      });
    }

    private showSuccessMessage(message: string): void {
      this.successMessage = message;
      if (this.successMessageTimer) {
        clearTimeout(this.successMessageTimer);
      }
      this.successMessageTimer = setTimeout(() => {
        this.successMessage = null;
        this.successMessageTimer = null;
      }, 6000);
    }
}
