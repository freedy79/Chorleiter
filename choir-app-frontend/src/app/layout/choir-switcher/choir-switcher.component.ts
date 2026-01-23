import { Component, OnInit, OnDestroy, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MaterialModule } from '@modules/material.module';
import { AuthService } from 'src/app/core/services/auth.service';
import { Choir } from 'src/app/core/models/choir';
import { DebugLogService } from '@core/services/debug-log.service';

@Component({
  selector: 'app-choir-switcher',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './choir-switcher.component.html',
  styleUrls: ['./choir-switcher.component.scss']
})
export class ChoirSwitcherComponent implements OnInit, OnDestroy {
  private readonly destroyRef = inject(DestroyRef);
  availableChoirs$: Observable<Choir[]>;
  activeChoir$: Observable<Choir | null>;

  constructor(private authService: AuthService, private logger: DebugLogService) {
    this.availableChoirs$ = this.authService.availableChoirs$.pipe(
      tap(choirs => this.logger.log('ChoirSwitcher available choirs', choirs))
    );
    this.activeChoir$ = this.authService.activeChoir$.pipe(
      tap(choir => this.logger.log('ChoirSwitcher active choir', choir))
    );
  }

  ngOnInit(): void {}

  onChoirChange(choirId: number): void {
    //console.debug('ChoirSwitcher onChoirChange', choirId);
    this.authService.switchChoir(choirId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  ngOnDestroy(): void {
    // Cleanup handled by takeUntilDestroyed
  }
}
