import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '@core/services/api.service';

interface DemoLead {
  id: number;
  email: string;
  expiresAt: string;
  verifiedAt: string | null;
  requestedIp: string | null;
  verifiedIp: string | null;
  userAgent: string | null;
  createdAt: string;
}

@Component({
  selector: 'app-demo-leads-hub',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatTableModule, MatChipsModule, MatTooltipModule],
  template: `
    <div class="demo-leads-hub">
      <div class="toolbar">
        <div>
          <h3>Demo-Leads</h3>
          <p>Interessenten mit bestätigtem Demo-Zugang und Ablaufdatum.</p>
        </div>
        <button mat-stroked-button color="primary" type="button" (click)="loadLeads()">
          <mat-icon>refresh</mat-icon>
          Aktualisieren
        </button>
      </div>

      <mat-card>
        <mat-card-content>
          <div *ngIf="loading" class="state-row">
            <mat-icon>hourglass_empty</mat-icon>
            <span>Lade Demo-Leads …</span>
          </div>

          <div *ngIf="!loading && leads.length === 0" class="state-row empty">
            <mat-icon>mail_outline</mat-icon>
            <span>Noch keine Demo-Leads vorhanden.</span>
          </div>

          <div class="table-wrap" *ngIf="!loading && leads.length > 0">
            <table mat-table [dataSource]="leads" class="lead-table">
              <ng-container matColumnDef="email">
                <th mat-header-cell *matHeaderCellDef>E-Mail</th>
                <td mat-cell *matCellDef="let lead">{{ lead.email }}</td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let lead">
                  <mat-chip [color]="getStatusColor(lead)" selected>{{ getStatusLabel(lead) }}</mat-chip>
                </td>
              </ng-container>

              <ng-container matColumnDef="createdAt">
                <th mat-header-cell *matHeaderCellDef>Erstellt</th>
                <td mat-cell *matCellDef="let lead">{{ lead.createdAt | date:'short' }}</td>
              </ng-container>

              <ng-container matColumnDef="expiresAt">
                <th mat-header-cell *matHeaderCellDef>Läuft ab</th>
                <td mat-cell *matCellDef="let lead">{{ lead.expiresAt | date:'short' }}</td>
              </ng-container>

              <ng-container matColumnDef="requestedIp">
                <th mat-header-cell *matHeaderCellDef>IP</th>
                <td mat-cell *matCellDef="let lead">{{ lead.requestedIp || '—' }}</td>
              </ng-container>

              <ng-container matColumnDef="verifiedAt">
                <th mat-header-cell *matHeaderCellDef>Bestätigt</th>
                <td mat-cell *matCellDef="let lead">{{ lead.verifiedAt ? (lead.verifiedAt | date:'short') : '—' }}</td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .demo-leads-hub {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .toolbar {
      display: flex;
      justify-content: space-between;
      align-items: end;
      gap: 16px;

      h3 {
        margin: 0 0 4px;
        font-size: 1.1rem;
      }

      p {
        margin: 0;
        color: var(--text-secondary, rgba(0,0,0,0.65));
      }
    }

    .state-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 16px 0;
    }

    .state-row.empty {
      opacity: 0.8;
    }

    .table-wrap {
      overflow: auto;
    }

    .lead-table {
      width: 100%;
    }
  `]
})
export class DemoLeadsHubComponent implements OnInit {
  leads: DemoLead[] = [];
  loading = false;
  displayedColumns = ['email', 'status', 'createdAt', 'expiresAt', 'requestedIp', 'verifiedAt'];

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadLeads();
  }

  loadLeads(): void {
    this.loading = true;
    this.api.getDemoLeads().subscribe({
      next: (leads) => {
        this.leads = leads;
        this.loading = false;
      },
      error: () => {
        this.leads = [];
        this.loading = false;
      }
    });
  }

  getStatusLabel(lead: DemoLead): string {
    if (lead.verifiedAt) {
      return 'Bestätigt';
    }
    return new Date(lead.expiresAt) < new Date() ? 'Abgelaufen' : 'Offen';
  }

  getStatusColor(lead: DemoLead): 'primary' | 'accent' | 'warn' {
    if (lead.verifiedAt) {
      return 'primary';
    }
    return new Date(lead.expiresAt) < new Date() ? 'warn' : 'accent';
  }
}
