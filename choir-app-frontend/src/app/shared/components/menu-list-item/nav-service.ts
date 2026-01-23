import { Injectable, OnDestroy } from '@angular/core';
import { Event, NavigationEnd, Router } from '@angular/router';
import { BehaviorSubject, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatSidenav } from '@angular/material/sidenav';

@Injectable()
export class NavService implements OnDestroy {
  public appDrawer: MatSidenav | null = null;
  public currentUrl = new BehaviorSubject<string>('');
  private destroy$ = new Subject<void>();

  constructor(private router: Router) {
    this.router.events.pipe(
      takeUntil(this.destroy$)
    ).subscribe((event: Event) => {
      if (event instanceof NavigationEnd) {
        this.currentUrl.next(event.urlAfterRedirects);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  public closeNav(): void {
    if (this.appDrawer && this.appDrawer.mode === 'over') {
      this.appDrawer.close();
    }
  }

  public openNav(): void {
    if (this.appDrawer) {
      this.appDrawer.open();
    }
  }

  public getMode(): string | undefined {
    return this.appDrawer?.mode;
  }
}
