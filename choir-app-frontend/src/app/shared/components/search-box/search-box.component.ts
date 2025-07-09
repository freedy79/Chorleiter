
import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { SearchService } from '@core/services/search.service';
import { Router, RouterModule } from '@angular/router';
import { MaterialModule } from '@modules/material.module';

import { FormsModule } from '@angular/forms';



@Component({
  selector: 'app-search-box',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatAutocompleteModule, MaterialModule, RouterModule],
  templateUrl: './search-box.component.html',
  styleUrls: ['./search-box.component.scss']
})
export class SearchBoxComponent implements OnInit {
  searchCtrl = new FormControl('');
  results: { pieces: any[]; events: any[]; collections: any[] } = { pieces: [], events: [], collections: [] };

  constructor(private search: SearchService, private router: Router) {}

  ngOnInit(): void {
    this.searchCtrl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(val => val ? this.search.searchAll(val) : of({ pieces: [], events: [], collections: [] }))
    ).subscribe(res => this.results = res);

  }

  goToResults(): void {
    const term = this.searchCtrl.value;
    if (term) {
      this.router.navigate(['/search'], { queryParams: { q: term } });
    }
  }
}
