import { Component, OnInit, DestroyRef, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { catchError, debounceTime, distinctUntilChanged, filter, switchMap, tap } from 'rxjs/operators';
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

  @Input() set initialQuery(value: string) {
    if (value && value !== this.searchCtrl.value) {
      this.searchCtrl.setValue(value, { emitEvent: false });
      this.currentQuery = value;
    }
  }
  historyEntries: SearchHistoryEntry[] = [];
  showHistory = false;
  suggestions: SearchSuggestion[] = [];
  total = 0;
  isLoading = false;
  noResults = false;
  currentQuery = '';
  private pendingSuggestion: SearchSuggestion | null = null;

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
      tap(val => {
        // Immediately clear stale suggestions when input changes
        const strVal = typeof val === 'string' ? val : '';
        if (strVal !== this.currentQuery && this.suggestions.length) {
          this.suggestions = [];
          this.noResults = false;
        }
      }),
      // Filter out special autocomplete option values written by MatAutocomplete
      filter(val => typeof val === 'string' && !val.startsWith('__')),
      debounceTime(300),
      distinctUntilChanged(),
      tap(val => {
        const strVal = typeof val === 'string' ? val : '';
        this.currentQuery = strVal;
        this.isLoading = !!strVal;
        this.noResults = false;
        this.showHistory = false;
      }),
      switchMap(val => (val && typeof val === 'string')
        ? this.search.searchSuggestions(val).pipe(
            catchError(() => of({ suggestions: [] as SearchSuggestion[], total: 0 }))
          )
        : of({ suggestions: [] as SearchSuggestion[], total: 0 })),
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

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  highlight(text: string, query: string): SafeHtml {
    const escaped = this.escapeHtml(text);
    if (!query) return this.sanitizer.bypassSecurityTrustHtml(escaped);
    // Split query into words, ignoring punctuation, so highlighting works
    // even when the user omits punctuation (e.g. "Halleluja komm" highlights "Halleluja, komm!")
    const words = query.split(/[\s,.!?;:'"()\-\u2013\u2014/\\]+/).filter(w => w.length > 0);
    if (!words.length) return this.sanitizer.bypassSecurityTrustHtml(escaped);
    const pattern = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[\\s,.!?\'"();:\\-\u2013\u2014/\\\\]*');
    const regex = new RegExp(`(${pattern})`, 'ig');
    const result = escaped.replace(regex, '<mark>$1</mark>');
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
    if (typeof value === 'string') {
      if (value === '__show_all__') return this.currentQuery;
      if (value.startsWith('__history__')) return value.substring('__history__'.length);
      return value;
    }
    return value.text || '';
  };

  onSuggestionSelection(event: any, s: SearchSuggestion): void {
    if (event.isUserInput) {
      this.pendingSuggestion = s;
    }
  }

  onOptionSelected(value: any): void {
    // Check for pending suggestion from onSelectionChange
    if (this.pendingSuggestion) {
      const s = this.pendingSuggestion;
      this.pendingSuggestion = null;
      this.navigateToSuggestion(s);
      return;
    }

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
        this.searchCtrl.setValue(this.currentQuery, { emitEvent: false });
        this.goToResults();
        return;
      }

      this.searchCtrl.setValue(value, { emitEvent: false });
      this.goToResults();
      this.showHistory = false;
      return;
    }
  }

  private navigateToSuggestion(s: SearchSuggestion): void {
    // Save to history
    this.historyService.addToHistory({
      query: s.text,
      resultCount: 1
    }).subscribe();

    // Clear the search input (emit to cancel any pending debounce from autocomplete)
    this.searchCtrl.setValue('', { emitEvent: true });
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
