import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SearchService, SearchSuggestion, SearchSuggestionType } from '@core/services/search.service';
import { SearchHistoryService, SearchHistoryEntry } from '@core/services/search-history.service';
import { Router, RouterModule } from '@angular/router';
import { MaterialModule } from '@modules/material.module';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-search-box',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatAutocompleteModule, MaterialModule, RouterModule],
  templateUrl: './search-box.component.html',
  styleUrls: ['./search-box.component.scss']
})
export class SearchBoxComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  searchCtrl = new FormControl('');
  historyEntries: SearchHistoryEntry[] = [];
  showHistory = false;
  suggestions: SearchSuggestion[] = [];
  total = 0;
  isLoading = false;
  noResults = false;
  currentQuery = '';

  readonly typeLabels: Record<SearchSuggestionType, string> = {
    piece: 'Stücke',
    composer: 'Komponisten',
    collection: 'Sammlungen',
    category: 'Kategorien',
    author: 'Autoren',
    publisher: 'Verlage'
  };

  readonly typeIcons: Record<SearchSuggestionType, string> = {
    piece: 'music_note',
    composer: 'person',
    collection: 'collections_bookmark',
    category: 'category',
    author: 'edit',
    publisher: 'store'
  };

  constructor(
    private search: SearchService,
    private historyService: SearchHistoryService,
    private router: Router,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.loadHistory();

    this.searchCtrl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(val => {
        this.currentQuery = (val || '').toString();
        this.isLoading = !!this.currentQuery;
        this.noResults = false;
        this.showHistory = false;
      }),
      switchMap(val => val ? this.search.searchSuggestions(val) : of({ suggestions: [], total: 0 })),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((res) => {
      this.suggestions = res.suggestions || [];
      this.total = res.total || 0;
      this.isLoading = false;
      this.noResults = !!this.currentQuery && !this.suggestions.length;
    });
  }

  loadHistory(): void {
    this.historyService.getCombinedHistory(10).subscribe(h => {
      this.historyEntries = h;
    });
  }

  onInputFocus(): void {
    if (!this.searchCtrl.value) {
      this.showHistory = true;
    }
  }

  get groupedSuggestions(): { type: SearchSuggestionType; label: string; items: SearchSuggestion[] }[] {
    const groups: Record<SearchSuggestionType, SearchSuggestion[]> = {
      piece: [],
      composer: [],
      collection: [],
      category: [],
      author: [],
      publisher: []
    };

    for (const s of this.suggestions) {
      groups[s.type]?.push(s);
    }

    return (Object.keys(groups) as SearchSuggestionType[])
      .filter(t => groups[t].length)
      .map(t => ({
        type: t,
        label: `${this.typeLabels[t]} (${groups[t].length})`,
        items: groups[t]
      }));
  }

  clearHistory(): void {
    if (confirm('Suchhistorie komplett löschen?')) {
      this.historyService.clearHistory().subscribe(() => {
        this.historyEntries = [];
      });
    }
  }

  deleteHistoryEntry(event: Event, entryId: number): void {
    event.stopPropagation();
    if (entryId) {
      this.historyService.removeEntry(entryId).subscribe(() => {
        this.loadHistory();
      });
    }
  }

  highlight(text: string, query: string): SafeHtml {
    if (!query) return this.sanitizer.bypassSecurityTrustHtml(text);
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'ig');
    const result = text.replace(regex, '<mark>$1</mark>');
    return this.sanitizer.bypassSecurityTrustHtml(result);
  }

  clearSearch(): void {
    this.searchCtrl.setValue('', { emitEvent: true });
    this.suggestions = [];
    this.total = 0;
    this.noResults = false;
    this.showHistory = false;
  }

  goToResults(): void {
    const term = this.searchCtrl.value;
    if (term) {
      this.historyService.addToHistory({
        query: term,
        resultCount: this.total
      }).subscribe();
      this.router.navigate(['/search'], { queryParams: { q: term } });
    }
  }

  displaySuggestion = (value: any): string => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return value.text || '';
  };

  onOptionSelected(value: any): void {
    if (!value) {
      return;
    }

    // String values: history entries or show-all
    if (typeof value === 'string') {
      if (value.startsWith('__history__')) {
        const query = value.substring('__history__'.length);
        this.searchCtrl.setValue(query, { emitEvent: true });
        return;
      }

      if (value === '__show_all__') {
        this.goToResults();
        return;
      }

      this.searchCtrl.setValue(value, { emitEvent: false });
      this.goToResults();
      this.showHistory = false;
      return;
    }

    // Suggestion object: navigate directly to the entity
    const suggestion = value as SearchSuggestion;
    this.navigateToSuggestion(suggestion);
  }

  private navigateToSuggestion(s: SearchSuggestion): void {
    // Save to history
    this.historyService.addToHistory({
      query: s.text,
      resultCount: 1
    }).subscribe();

    // Clear the search input
    this.searchCtrl.setValue('', { emitEvent: false });
    this.suggestions = [];
    this.showHistory = false;

    switch (s.type) {
      case 'piece':
        this.router.navigate(['/pieces', s.id]);
        break;
      case 'collection':
        this.router.navigate(['/collections/edit', s.id]);
        break;
      case 'composer':
        this.navigateToRepertoireWithFilter({ composerIds: [s.id] });
        break;
      case 'category':
        this.navigateToRepertoireWithFilter({ categoryIds: [s.id] });
        break;
      case 'author':
      case 'publisher':
        // For authors/publishers, search for their name in repertoire
        this.router.navigate(['/search'], { queryParams: { q: s.text } });
        break;
    }
  }

  private navigateToRepertoireWithFilter(filter: Record<string, any>): void {
    localStorage.setItem('repertoireFilters', JSON.stringify(filter));
    this.router.navigate(['/repertoire']);
  }
}
