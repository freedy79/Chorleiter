import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface PayPalPDTResponse {
  success: boolean;
  verified: boolean;
  configured?: boolean;
  transactionId?: string;
  amount?: number;
  currency?: string;
  payerEmail?: string;
  payerName?: string;
  paymentDate?: string;
  paymentStatus?: string;
  message?: string;
  details?: any;
}

export interface DonationSummary {
  totalLast12Months: number;
  donations: { id: number; amount: number; donatedAt: string }[];
}

@Injectable({ providedIn: 'root' })
export class PayPalService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  verifyPDT(txToken: string): Observable<PayPalPDTResponse> {
    return this.http.get<PayPalPDTResponse>(`${this.apiUrl}/paypal/pdt?tx=${txToken}`);
  }

  getDonationSummary(): Observable<DonationSummary> {
    return this.http.get<DonationSummary>(`${this.apiUrl}/paypal/donations/summary`);
  }
}
