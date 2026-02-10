import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { FormsModule } from '@angular/forms';
import { LoanCartService, CartItem } from '@core/services/loan-cart.service';
import { ApiService } from '@core/services/api.service';
import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';
import { Router } from '@angular/router';
import { LoanRequestPayload } from '@core/models/loan-request';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-loan-cart',
  standalone: true,
  imports: [CommonModule, MaterialModule, FormsModule],
  templateUrl: './loan-cart.component.html',
  styleUrls: ['./loan-cart.component.scss']
})
export class LoanCartComponent {
  items$!: Observable<CartItem[]>;
  startDate?: Date;
  endDate?: Date;
  reason = '';
  choir$!: Observable<any>;
  user$!: Observable<any>;
  isSingerOnly = false;

  constructor(private cart: LoanCartService, private api: ApiService, private auth: AuthService, private notification: NotificationService, private router: Router) {
    this.items$ = this.cart.items$;
    this.choir$ = this.api.getMyChoirDetails();
    this.user$ = this.auth.currentUser$;
    this.auth.isSingerOnly$.subscribe(isSingerOnly => {
      this.isSingerOnly = isSingerOnly;
      if (isSingerOnly) {
        this.router.navigate(['/library']);
      }
    });
  }

  remove(id: number): void {
    this.cart.removeItem(id);
  }

  sendRequest(): void {
    const items = this.cart.getItems();
    const payload: LoanRequestPayload = {
      startDate: this.startDate,
      endDate: this.endDate,
      reason: this.reason,
      items: items.map(i => ({ libraryItemId: i.item.id, quantity: i.quantity }))
    };
    this.api.requestLibraryLoan(payload).subscribe(() => {
      this.notification.success('Anfrage gesendet');
      this.cart.clear();
      this.router.navigate(['/library']);
    });
  }
}
