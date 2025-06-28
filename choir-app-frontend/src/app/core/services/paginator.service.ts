import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PaginatorService {
  private readonly KEY_PREFIX = 'paginator-page-size-';

  getPageSize(key: string, defaultSize: number): number {
    const stored = localStorage.getItem(this.KEY_PREFIX + key);
    const val = stored ? parseInt(stored, 10) : NaN;
    return isNaN(val) ? defaultSize : val;
  }

  setPageSize(key: string, size: number): void {
    localStorage.setItem(this.KEY_PREFIX + key, size.toString());
  }
}
