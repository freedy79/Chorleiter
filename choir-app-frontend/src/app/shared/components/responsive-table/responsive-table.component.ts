import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ResponsiveService } from '@shared/services/responsive.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ResponsiveColumn {
  key: string;
  label: string;
  width?: string;
  hideOnMobile?: boolean;
  icon?: string;
  render?: (item: any) => string;
}

export interface ResponsiveAction {
  label: string;
  icon: string;
  color?: string;
  click: (item: any) => void;
  condition?: (item: any) => boolean;
}

@Component({
  selector: 'app-responsive-table',
  templateUrl: './responsive-table.component.html',
  styleUrls: ['./responsive-table.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule
  ]
})
export class ResponsiveTableComponent implements OnInit {
  @Input() data: any[] = [];
  @Input() columns: ResponsiveColumn[] = [];
  @Input() actions: ResponsiveAction[] = [];
  @Input() title = '';
  @Input() pageSize = 10;
  @Output() actionClicked = new EventEmitter<{ action: ResponsiveAction; item: any }>();

  isMobile$: Observable<boolean>;
  visibleColumns: ResponsiveColumn[] = [];
  paginatedData: any[] = [];
  currentPage = 0;
  Math = Math;

  constructor(private responsive: ResponsiveService) {
    this.isMobile$ = this.responsive.isHandset$;
  }

  ngOnInit(): void {
    this.updateVisibleColumns();
    this.updatePagination();
  }

  ngOnChanges(): void {
    this.updatePagination();
  }

  updateVisibleColumns(): void {
    this.isMobile$.subscribe((isMobile: boolean) => {
      this.visibleColumns = this.columns.filter(col => !col.hideOnMobile || !isMobile);
    });
  }

  updatePagination(): void {
    const startIdx = this.currentPage * this.pageSize;
    const endIdx = startIdx + this.pageSize;
    this.paginatedData = this.data.slice(startIdx, endIdx);
  }

  onAction(action: ResponsiveAction, item: any): void {
    this.actionClicked.emit({ action, item });
    action.click(item);
  }

  nextPage(): void {
    if ((this.currentPage + 1) * this.pageSize < this.data.length) {
      this.currentPage++;
      this.updatePagination();
    }
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.updatePagination();
    }
  }

  getCellValue(item: any, column: ResponsiveColumn): string {
    if (column.render) {
      return column.render(item);
    }
    return item[column.key] || '-';
  }

  shouldShowAction(action: ResponsiveAction, item: any): boolean {
    return !action.condition || action.condition(item);
  }

  getDisplayColumns(): string[] {
    const cols = this.visibleColumns.map(c => c.key);
    if (this.actions.length > 0) {
      cols.push('actions');
    }
    return cols;
  }
}
