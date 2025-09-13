import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { FormsModule } from '@angular/forms';
import { LoanCartService, CartItem } from '@core/services/loan-cart.service';
import { ApiService } from '@core/services/api.service';
import { AuthService } from '@core/services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';
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

  constructor(private cart: LoanCartService, private api: ApiService, private auth: AuthService, private snack: MatSnackBar, private router: Router) {
    this.items$ = this.cart.items$;
    this.choir$ = this.api.getMyChoirDetails();
    this.user$ = this.auth.currentUser$;
    this.auth.currentUser$.subscribe(user => {
      const roles = Array.isArray(user?.roles) ? user.roles : [];
      this.isSingerOnly = roles.includes('singer') && !roles.some(r => ['choir_admin', 'director', 'admin', 'librarian'].includes(r));
      if (this.isSingerOnly) {
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
      this.snack.open('Anfrage gesendet', undefined, { duration: 3000 });
      this.cart.clear();
      this.router.navigate(['/library']);
    });
  }
}
