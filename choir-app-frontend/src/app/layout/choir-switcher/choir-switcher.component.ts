import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MaterialModule } from '@modules/material.module';
import { AuthService } from 'src/app/core/services/auth.service';
import { Choir } from 'src/app/core/models/choir';

@Component({
  selector: 'app-choir-switcher',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './choir-switcher.component.html',
  styleUrls: ['./choir-switcher.component.scss']
})
export class ChoirSwitcherComponent {
  availableChoirs$: Observable<Choir[]>;
  activeChoir$: Observable<Choir | null>;

  constructor(private authService: AuthService) {
    this.availableChoirs$ = this.authService.availableChoirs$.pipe(
      tap(choirs => console.debug('ChoirSwitcher available choirs', choirs))
    );
    this.activeChoir$ = this.authService.activeChoir$.pipe(
      tap(choir => console.debug('ChoirSwitcher active choir', choir))
    );
  }

  onChoirChange(choirId: number): void {
    console.debug('ChoirSwitcher onChoirChange', choirId);
    this.authService.switchChoir(choirId).subscribe();
  }
}
