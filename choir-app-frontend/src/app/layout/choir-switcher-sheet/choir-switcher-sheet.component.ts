import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';
import { MaterialModule } from '@modules/material.module';
import { Choir } from '@core/models/choir';

export interface ChoirSwitcherData {
  choirs: Choir[];
  activeChoirId: number | null;
}

@Component({
  selector: 'app-choir-switcher-sheet',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  template: `
    <div class="choir-switcher-sheet">
      <div class="sheet-header">
        <h2>Chor wechseln</h2>
        <button mat-icon-button (click)="close()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-nav-list>
        <a mat-list-item
           *ngFor="let choir of data.choirs"
           (click)="selectChoir(choir.id)"
           [class.active]="choir.id === data.activeChoirId">
          <mat-icon matListItemIcon>
            {{ choir.id === data.activeChoirId ? 'check_circle' : 'groups' }}
          </mat-icon>
          <div matListItemTitle>{{ choir.name }}</div>
          <div matListItemLine *ngIf="choir.location">
            {{ choir.location }}
          </div>
        </a>
      </mat-nav-list>
    </div>
  `,
  styles: [`
    .choir-switcher-sheet {
      padding: 0;
      max-height: 70vh;
      overflow-y: auto;
    }

    .sheet-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1rem 0.5rem;
      border-bottom: 1px solid rgba(0, 0, 0, 0.12);
      position: sticky;
      top: 0;
      background: var(--page-header-bg-color, #fff);
      z-index: 1;
    }

    .sheet-header h2 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 500;
    }

    mat-nav-list {
      padding-top: 0;
    }

    a.mat-mdc-list-item {
      min-height: 72px;
      transition: background-color 150ms;
    }

    a.mat-mdc-list-item.active {
      background-color: rgba(25, 118, 210, 0.08);

      mat-icon {
        color: var(--brand, #1976d2);
      }
    }

    a.mat-mdc-list-item:hover {
      background-color: rgba(0, 0, 0, 0.04);
    }

    mat-icon[matListItemIcon] {
      margin-right: 1rem;
    }
  `]
})
export class ChoirSwitcherSheetComponent {
  constructor(
    private bottomSheetRef: MatBottomSheetRef<ChoirSwitcherSheetComponent>,
    @Inject(MAT_BOTTOM_SHEET_DATA) public data: ChoirSwitcherData
  ) {}

  selectChoir(choirId: number): void {
    this.bottomSheetRef.dismiss(choirId);
  }

  close(): void {
    this.bottomSheetRef.dismiss();
  }
}
