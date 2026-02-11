import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';

/**
 * Reusable alphabet filter component for filtering lists by first letter.
 * Displays A-Z buttons plus an "Alle" (All) button.
 */
@Component({
  selector: 'app-alphabet-filter',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  template: `
    <div class="letter-filter">
      <button
        mat-button
        *ngFor="let letter of letters"
        (click)="onLetterSelect(letter)"
        [color]="selectedLetter === letter ? 'primary' : undefined"
        class="letter-button">
        {{ letter }}
      </button>
    </div>
  `,
  styles: [`
    .letter-filter {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-bottom: 16px;
    }

    .letter-button {
      min-width: 40px;
      padding: 0 8px;
    }

    @media (max-width: 768px) {
      .letter-filter {
        gap: 2px;
      }

      .letter-button {
        min-width: 32px;
        padding: 0 4px;
        font-size: 12px;
      }
    }
  `]
})
export class AlphabetFilterComponent {
  /**
   * Array of items to filter. Component will filter based on the specified field.
   */
  @Input() items: any[] = [];

  /**
   * Name of the field to filter on (e.g., 'name', 'title').
   * The field value should be a string.
   */
  @Input() filterField: string = 'name';

  /**
   * Emits the filtered array whenever the selected letter changes.
   */
  @Output() filtered = new EventEmitter<any[]>();

  letters: string[] = ['Alle', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
  selectedLetter = 'Alle';

  onLetterSelect(letter: string): void {
    this.selectedLetter = letter;
    this.applyFilter();
  }

  private applyFilter(): void {
    if (!this.items) {
      this.filtered.emit([]);
      return;
    }

    let filteredItems = [...this.items];

    if (this.selectedLetter !== 'Alle') {
      const letter = this.selectedLetter.toUpperCase();
      filteredItems = this.items.filter(item => {
        const fieldValue = item[this.filterField];
        return fieldValue &&
               typeof fieldValue === 'string' &&
               fieldValue.toUpperCase().startsWith(letter);
      });
    }

    this.filtered.emit(filteredItems);
  }

  /**
   * Reset filter to "Alle" (all items).
   */
  reset(): void {
    this.selectedLetter = 'Alle';
    this.applyFilter();
  }
}
