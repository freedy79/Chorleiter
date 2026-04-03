import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AdminService } from '@core/services/admin.service';

interface OtaToken {
  id: number;
  token: string;
  expiresAt: string;
  usedAt: string | null;
  usedByIp: string | null;
  label: string | null;
  createdAt: string;
  createdBy?: { id: number; firstName: string; name: string };
  targetUser?: { id: number; firstName: string; name: string };
}

@Component({
  selector: 'app-ota-tokens',
  templateUrl: './ota-tokens.component.html',
  styleUrls: ['./ota-tokens.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatChipsModule,
    MatTooltipModule,
    MatSnackBarModule,
  ],
})
export class OtaTokensComponent implements OnInit {
  tokens: OtaToken[] = [];
  newLabel = '';
  generatedLink: string | null = null;
  loading = false;
  displayedColumns = ['status', 'label', 'targetUser', 'createdAt', 'expiresAt', 'actions'];

  constructor(
    private adminService: AdminService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.loadTokens();
  }

  loadTokens(): void {
    this.loading = true;
    this.adminService.listOtaTokens().subscribe({
      next: (tokens) => {
        this.tokens = tokens;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Fehler beim Laden der Tokens', 'OK', { duration: 3000 });
      },
    });
  }

  generate(): void {
    this.loading = true;
    this.adminService.generateOtaToken(this.newLabel || undefined).subscribe({
      next: (result) => {
        const baseUrl = window.location.origin;
        this.generatedLink = `${baseUrl}/ota/${result.token}`;
        this.newLabel = '';
        this.loadTokens();
        this.snackBar.open('Token erzeugt!', 'OK', { duration: 3000 });
      },
      error: (err) => {
        this.loading = false;
        this.snackBar.open(err.error?.message || 'Fehler beim Erzeugen', 'OK', { duration: 3000 });
      },
    });
  }

  revoke(id: number): void {
    this.adminService.revokeOtaToken(id).subscribe({
      next: () => {
        this.loadTokens();
        this.snackBar.open('Token widerrufen', 'OK', { duration: 3000 });
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Fehler', 'OK', { duration: 3000 });
      },
    });
  }

  copyLink(): void {
    if (this.generatedLink) {
      navigator.clipboard.writeText(this.generatedLink);
      this.snackBar.open('Link kopiert!', 'OK', { duration: 2000 });
    }
  }

  dismissLink(): void {
    this.generatedLink = null;
  }

  getStatus(token: OtaToken): 'active' | 'used' | 'expired' {
    if (token.usedAt) return 'used';
    if (new Date(token.expiresAt) < new Date()) return 'expired';
    return 'active';
  }

  getStatusLabel(token: OtaToken): string {
    const status = this.getStatus(token);
    if (status === 'used') return 'Verwendet';
    if (status === 'expired') return 'Abgelaufen';
    return 'Aktiv';
  }

  getStatusColor(token: OtaToken): string {
    const status = this.getStatus(token);
    if (status === 'used') return 'accent';
    if (status === 'expired') return 'warn';
    return 'primary';
  }
}
