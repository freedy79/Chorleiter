import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { LibraryItem } from '../models/library-item';

export interface CartItem {
  item: LibraryItem;
  quantity: number;
}

@Injectable({ providedIn: 'root' })
export class LoanCartService {
  private itemsSubject = new BehaviorSubject<CartItem[]>([]);
  items$ = this.itemsSubject.asObservable();

  addItem(item: LibraryItem): void {
    const items = this.itemsSubject.value;
    const existing = items.find(i => i.item.id === item.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      items.push({ item, quantity: 1 });
    }
    this.itemsSubject.next([...items]);
  }

  removeItem(id: number): void {
    const items = this.itemsSubject.value.filter(i => i.item.id !== id);
    this.itemsSubject.next(items);
  }

  clear(): void {
    this.itemsSubject.next([]);
  }

  getItems(): CartItem[] {
    return this.itemsSubject.value;
  }
}
