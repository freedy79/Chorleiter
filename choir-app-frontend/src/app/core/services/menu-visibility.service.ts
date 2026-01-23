import { Injectable, DestroyRef, inject } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from './auth.service';

// Constants
export enum MenuKey {
  DASHBOARD = 'dashboard',
  EVENTS = 'events',
  DIENSTPLAN = 'dienstplan',
  AVAILABILITY = 'availability',
  PARTICIPATION = 'participation',
  POSTS = 'posts',
  PROGRAMS = 'programs',
  STATS = 'stats',
  MANAGE_CHOIR = 'manageChoir',
  REPERTOIRE = 'repertoire',
  COLLECTIONS = 'collections',
  LIBRARY = 'library'
}

const MENU_KEYS = Object.values(MenuKey);

const CHOIR_ADMIN_ROLES = ['director', 'choir_admin', 'organist'] as const;
const GLOBAL_ADMIN_ROLES = ['admin', 'librarian'] as const;
const DEMO_RESTRICTED_KEYS = [
  MenuKey.DIENSTPLAN,
  MenuKey.AVAILABILITY,
  MenuKey.PARTICIPATION,
  MenuKey.PROGRAMS,
  MenuKey.MANAGE_CHOIR,
  MenuKey.COLLECTIONS,
  MenuKey.LIBRARY
] as const;

export interface MenuVisibility extends Record<MenuKey, boolean> {}

@Injectable({
  providedIn: 'root'
})
export class MenuVisibilityService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly visibilitySubject = new BehaviorSubject<MenuVisibility>(this.getEmptyVisibility());

  readonly visibility$ = this.visibilitySubject.asObservable();

  constructor(private auth: AuthService) {
    this.initializeMenuVisibility();
  }

  private initializeMenuVisibility(): void {
    combineLatest([
      this.auth.globalRoles$,
      this.auth.choirRoles$,
      this.auth.activeChoir$,
      this.auth.isDemo$
    ])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([globalRoles, choirRoles, choir, isDemo]: [any, any, any, any]) => {
        const visibility = this.computeVisibility(globalRoles, choirRoles, choir, isDemo);
        this.visibilitySubject.next(visibility);
      });
  }

  private computeVisibility(
    globalRoles: string[],
    choirRoles: string[],
    choir: any,
    isDemo: boolean
  ): MenuVisibility {
    const visibility = this.getEmptyVisibility();

    if (!choir) {
      return visibility;
    }

    const modules = choir.modules || {};
    const hasChoirPrivilege = this.hasChoirPrivilege(choirRoles);
    const hasGlobalPrivilege = this.hasGlobalPrivilege(globalRoles);
    const hasPrivilegedRole = hasChoirPrivilege || hasGlobalPrivilege;

    const baseVisibility = this.getBaseVisibility(modules, hasPrivilegedRole);
    Object.assign(visibility, baseVisibility);

    if (isDemo) {
      this.applyDemoRestrictions(visibility);
    }

    if (this.isSingerOnly(choirRoles, hasPrivilegedRole)) {
      this.applySingerMenuRestrictions(visibility, modules);
    }

    return visibility;
  }

  private getEmptyVisibility(): MenuVisibility {
    const visibility: Partial<MenuVisibility> = {};
    MENU_KEYS.forEach(key => {
      (visibility as any)[key] = false;
    });
    return visibility as MenuVisibility;
  }

  private hasChoirPrivilege(choirRoles: string[]): boolean {
    return choirRoles.some(role => CHOIR_ADMIN_ROLES.includes(role as any));
  }

  private hasGlobalPrivilege(globalRoles: string[]): boolean {
    return globalRoles.some(role => GLOBAL_ADMIN_ROLES.includes(role as any));
  }

  private getBaseVisibility(modules: any, hasPrivilegedRole: boolean): MenuVisibility {
    return {
      [MenuKey.DASHBOARD]: true,
      [MenuKey.EVENTS]: true,
      [MenuKey.DIENSTPLAN]: modules.dienstplan === true && hasPrivilegedRole,
      [MenuKey.AVAILABILITY]: true,
      [MenuKey.PARTICIPATION]: hasPrivilegedRole,
      [MenuKey.POSTS]: true,
      [MenuKey.PROGRAMS]: modules.programs === true && hasPrivilegedRole,
      [MenuKey.STATS]: hasPrivilegedRole,
      [MenuKey.MANAGE_CHOIR]: true,
      [MenuKey.REPERTOIRE]: true,
      [MenuKey.COLLECTIONS]: true,
      [MenuKey.LIBRARY]: true
    } as MenuVisibility;
  }

  private applyDemoRestrictions(visibility: MenuVisibility): void {
    DEMO_RESTRICTED_KEYS.forEach(key => {
      (visibility as any)[key] = false;
    });
  }

  private isSingerOnly(choirRoles: string[], hasPrivilegedRole: boolean): boolean {
    return choirRoles.includes('singer') && !hasPrivilegedRole;
  }

  private applySingerMenuRestrictions(visibility: MenuVisibility, modules: any): void {
    const singerMenu = modules.singerMenu || {};
    MENU_KEYS.forEach(key => {
      if (singerMenu[key] === false) {
        (visibility as any)[key] = false;
      }
    });
  }

  isVisible(key: string): Observable<boolean> {
    if (!MENU_KEYS.includes(key as MenuKey)) {
      console.warn(`Invalid menu key: ${key}`);
      return this.visibility$.pipe(map(() => false));
    }
    return this.visibility$.pipe(
      map(v => v[key as MenuKey] === true),
      takeUntilDestroyed(this.destroyRef)
    );
  }
}
