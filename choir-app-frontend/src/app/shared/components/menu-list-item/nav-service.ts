import { Injectable } from '@angular/core';
import { Event, NavigationEnd, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

@Injectable()
export class NavService {
  public appDrawer: any;
  public currentUrl = new BehaviorSubject<string>('');

  constructor(private router: Router) {
    this.router.events.subscribe((event: Event) => {
      if (event instanceof NavigationEnd) {
        this.currentUrl.next(event.urlAfterRedirects);
      }
    });
  }

  public closeNav() {
    if (this.appDrawer && this.appDrawer.mode === 'over') {
      this.appDrawer.close();
    }
  }

  public openNav() {
    this.appDrawer.open();
  }

  public getMode() {
    return this.appDrawer.mode;
  }
}
