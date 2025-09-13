import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface MenuVisibility {
  [key: string]: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class MenuVisibilityService {
  private visibilitySubject = new BehaviorSubject<MenuVisibility>({});
  visibility$ = this.visibilitySubject.asObservable();

  constructor(private auth: AuthService) {
    combineLatest([this.auth.currentUser$, this.auth.activeChoir$]).subscribe(([user, choir]) => {
      const visibility: MenuVisibility = {};
      const keys = [
        'dashboard',
        'events',
        'dienstplan',
        'availability',
        'participation',
        'posts',
        'programs',
        'stats',
        'manageChoir',
        'repertoire',
        'collections',
        'library'
      ];
      keys.forEach(k => visibility[k] = false);
      if (choir) {
        const modules = choir.modules || {};
        const roles = Array.isArray(user?.roles) ? user.roles : [];
        const privilegedRoles = ['director', 'choir_admin', 'admin'];
        const hasPrivilegedRole = roles.some(r => privilegedRoles.includes(r));
        const base: MenuVisibility = {
          dashboard: true,
          events: true,
          dienstplan: modules.dienstplan === true && hasPrivilegedRole,
          availability: true,
          participation: hasPrivilegedRole,
          posts: true,
          programs: modules.programs === true && hasPrivilegedRole,
          stats: hasPrivilegedRole,
          manageChoir: true,
          repertoire: true,
          collections:true,
          library: true
        };
        Object.assign(visibility, base);
        const isSingerOnly = roles.includes('singer') &&
          !roles.some(r => ['choir_admin', 'director', 'admin', 'librarian', 'organist'].includes(r));
        if (isSingerOnly) {
          const singerMenu = modules.singerMenu || {};
          for (const key of Object.keys(base)) {
            if (singerMenu[key] === false) {
              visibility[key] = false;
            }
          }
        }
      }
      this.visibilitySubject.next(visibility);
    });
  }

  isVisible(key: string): Observable<boolean> {
    return this.visibility$.pipe(map(v => v[key] !== false));
  }
}
