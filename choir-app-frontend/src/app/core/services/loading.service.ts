import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private counter = 0;
  private loadingSubject = new BehaviorSubject<boolean>(false);
  loading$ = this.loadingSubject.asObservable();

  show(): void {
    this.counter++;
    if (this.counter === 1) {
      Promise.resolve().then(() => this.loadingSubject.next(true));
    }
  }

  hide(): void {
    if (this.counter > 0) {
      this.counter--;
      if (this.counter === 0) {
        Promise.resolve().then(() => this.loadingSubject.next(false));
      }
    }
  }
}
