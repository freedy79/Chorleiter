import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SearchService } from '@core/services/search.service';
import { Router, RouterModule } from '@angular/router';
import { MaterialModule } from '@modules/material.module';
import { Piece } from '@core/models/piece';
import { Event } from '@core/models/event';
import { Collection } from '@core/models/collection';

interface SearchResults {
  pieces: Piece[];
  events: Event[];
  collections: Collection[];
}

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
  results: SearchResults = { pieces: [], events: [], collections: [] };

  constructor(private search: SearchService, private router: Router) {}

  ngOnInit(): void {
    this.searchCtrl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(val => val ? this.search.searchAll(val) : of({ pieces: [], events: [], collections: [] } as SearchResults)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((res: any) => this.results = res);

  }

  goToResults(): void {
    const term = this.searchCtrl.value;
    if (term) {
      this.router.navigate(['/search'], { queryParams: { q: term } });
    }
  }
}
