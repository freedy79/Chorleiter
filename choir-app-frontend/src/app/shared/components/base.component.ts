import { Component, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * Base Component with Automatic Subscription Management
 *
 * This base class provides automatic cleanup of RxJS subscriptions
 * using the takeUntil pattern with a destroy$ subject.
 *
 * Usage:
 * ```typescript
 * export class MyComponent extends BaseComponent {
 *   ngOnInit() {
 *     this.myService.getData()
 *       .pipe(takeUntil(this.destroy$))
 *       .subscribe(data => { ... });
 *   }
 * }
 * ```
 *
 * The destroy$ subject will automatically emit and complete when
 * the component is destroyed, unsubscribing all observables that
 * use takeUntil(this.destroy$).
 */
@Component({
  template: ''
})
export abstract class BaseComponent implements OnDestroy {
  /**
   * Subject that emits when the component is destroyed
   * Use with takeUntil operator to automatically unsubscribe
   */
  protected destroy$ = new Subject<void>();

  /**
   * Called when component is destroyed
   * Automatically completes all subscriptions using takeUntil(this.destroy$)
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
