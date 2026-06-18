import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { InlineLoadingComponent } from '@shared/components/inline-loading/inline-loading.component';

@Component({
  selector: 'app-data-state',
  standalone: true,
  imports: [CommonModule, InlineLoadingComponent, EmptyStateComponent],
  templateUrl: './data-state.component.html',
  styleUrls: ['./data-state.component.scss'],
})
export class DataStateComponent {
  @Input() isLoading = false;
  @Input() hasError = false;
  @Input() errorTitle = 'Fehler beim Laden';
  @Input() errorMessage = 'Die Daten konnten nicht geladen werden.';
  @Input() isEmpty = false;
  @Input() emptyTitle = 'Keine Daten vorhanden';
  @Input() emptyMessage = '';
  @Input() emptyIcon = 'inbox';
  @Input() compact = false;

  @Output() retry = new EventEmitter<void>();

  get showContent(): boolean {
    return !this.isLoading && !this.hasError && !this.isEmpty;
  }
}
