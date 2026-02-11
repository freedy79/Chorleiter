/**
 * Responsive service for handling responsive design breakpoints.
 * Consolidates BreakpointObserver usage and provides a single source of truth
 * for breakpoints used throughout the application.
 */

import { Injectable } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Observable, map, shareReplay, startWith } from 'rxjs';

/**
 * Breakpoint definitions for the application.
 * Using common Material Design breakpoints plus application-specific ones.
 */
export const APP_BREAKPOINTS = {
  /** Extra small devices (< 600px) - Phones in portrait */
  XS: '(max-width: 599.98px)',

  /** Small devices (600px - 959px) - Tablets in portrait, large phones */
  SM: '(min-width: 600px) and (max-width: 959.98px)',

  /** Medium devices (960px - 1919px) - Tablets in landscape, small desktops */
  MD: '(min-width: 960px) and (max-width: 1919.98px)',

  /** Large devices (>= 1920px) - Large desktops */
  LG: '(min-width: 1920px)',

  /** Handset (portrait or landscape phone) */
  HANDSET: Breakpoints.Handset,

  /** Tablet (portrait or landscape tablet) */
  TABLET: Breakpoints.Tablet,

  /** Tablet or larger */
  TABLET_AND_UP: '(min-width: 600px)',

  /** Mobile threshold - Used for main navigation layout */
  MOBILE: '(max-width: 599.98px)',

  /** Desktop threshold - Used for main navigation layout */
  DESKTOP: '(min-width: 600px)',
};

/**
 * Interface tracking responsive state.
 */
export interface ResponsiveState {
  isXs: boolean;
  isSm: boolean;
  isMd: boolean;
  isLg: boolean;
  isHandset: boolean;
  isTablet: boolean;
  isTabletAndUp: boolean;
  isDesktop: boolean;
  isMobile: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ResponsiveService {
  /**
   * Observable emitting the current responsive state.
   */
  private readonly state$: Observable<ResponsiveState>;

  /**
   * Observable emitting true when on mobile (< 600px).
   */
  readonly isMobile$: Observable<boolean>;

  /**
   * Observable emitting true when on desktop (>= 600px).
   */
  readonly isDesktop$: Observable<boolean>;

  /**
   * Observable emitting true when on handset (portrait or landscape phone).
   */
  readonly isHandset$: Observable<boolean>;

  /**
   * Observable emitting true when on tablet or larger.
   */
  readonly isTabletAndUp$: Observable<boolean>;

  /**
   * Observable emitting true on XS breakpoint (< 600px).
   */
  readonly isXs$: Observable<boolean>;

  /**
   * Observable emitting true on SM breakpoint (600px - 959px).
   */
  readonly isSm$: Observable<boolean>;

  /**
   * Observable emitting true on MD breakpoint (960px - 1919px).
   */
  readonly isMd$: Observable<boolean>;

  /**
   * Observable emitting true on LG breakpoint (>= 1920px).
   */
  readonly isLg$: Observable<boolean>;

  constructor(private breakpointObserver: BreakpointObserver) {
    // Create the main state observable
    this.state$ = this.breakpointObserver
      .observe([
        APP_BREAKPOINTS.XS,
        APP_BREAKPOINTS.SM,
        APP_BREAKPOINTS.MD,
        APP_BREAKPOINTS.LG,
        APP_BREAKPOINTS.HANDSET,
        APP_BREAKPOINTS.TABLET,
        APP_BREAKPOINTS.TABLET_AND_UP,
        APP_BREAKPOINTS.DESKTOP,
      ])
      .pipe(
        map(result => ({
          isXs: result.breakpoints[APP_BREAKPOINTS.XS],
          isSm: result.breakpoints[APP_BREAKPOINTS.SM],
          isMd: result.breakpoints[APP_BREAKPOINTS.MD],
          isLg: result.breakpoints[APP_BREAKPOINTS.LG],
          isHandset: result.breakpoints[APP_BREAKPOINTS.HANDSET],
          isTablet: result.breakpoints[APP_BREAKPOINTS.TABLET],
          isTabletAndUp: result.breakpoints[APP_BREAKPOINTS.TABLET_AND_UP],
          isMobile: result.breakpoints[APP_BREAKPOINTS.DESKTOP] === false,
          isDesktop: result.breakpoints[APP_BREAKPOINTS.DESKTOP],
        })),
        startWith({
          isXs: false,
          isSm: false,
          isMd: false,
          isLg: false,
          isHandset: false,
          isTablet: false,
          isTabletAndUp: false,
          isMobile: true,
          isDesktop: false,
        }),
        shareReplay(1)
      );

    // Create individual observables from the state
    this.isMobile$ = this.state$.pipe(map(state => state.isMobile));
    this.isDesktop$ = this.state$.pipe(map(state => state.isDesktop));
    this.isHandset$ = this.state$.pipe(map(state => state.isHandset));
    this.isTabletAndUp$ = this.state$.pipe(map(state => state.isTabletAndUp));
    this.isXs$ = this.state$.pipe(map(state => state.isXs));
    this.isSm$ = this.state$.pipe(map(state => state.isSm));
    this.isMd$ = this.state$.pipe(map(state => state.isMd));
    this.isLg$ = this.state$.pipe(map(state => state.isLg));
  }

  /**
   * Gets the current responsive state synchronously.
   * Note: This provides the last emitted state. Use observables for reactive updates.
   *
   * @returns The current responsive state
   */
  getState(): Observable<ResponsiveState> {
    return this.state$;
  }

  /**
   * Checks if currently on mobile (< 600px) synchronously.
   * Use isMobile$ observable for reactive updates.
   *
   * @returns true if on mobile device
   */
  checkMobile(): boolean {
    return this.breakpointObserver.isMatched(APP_BREAKPOINTS.MOBILE);
  }

  /**
   * Checks if currently on desktop (>= 600px) synchronously.
   * Use isDesktop$ observable for reactive updates.
   *
   * @returns true if on desktop or larger
   */
  checkDesktop(): boolean {
    return this.breakpointObserver.isMatched(APP_BREAKPOINTS.DESKTOP);
  }

  /**
   * Checks if currently on handset synchronously.
   * Use isHandset$ observable for reactive updates.
   *
   * @returns true if on handset device
   */
  checkHandset(): boolean {
    return this.breakpointObserver.isMatched(APP_BREAKPOINTS.HANDSET);
  }

  /**
   * Checks if currently on tablet or larger synchronously.
   * Use isTabletAndUp$ observable for reactive updates.
   *
   * @returns true if on tablet or larger
   */
  checkTabletAndUp(): boolean {
    return this.breakpointObserver.isMatched(APP_BREAKPOINTS.TABLET_AND_UP);
  }
}
