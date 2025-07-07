import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { ApiService } from '@core/services/api.service';
import { MaterialModule } from '@modules/material.module';

@Component({
  selector: 'app-search-box',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatAutocompleteModule, MaterialModule],
  templateUrl: './search-box.component.html',
  styleUrls: ['./search-box.component.scss']
})
export class SearchBoxComponent implements OnInit {
  searchCtrl = new FormControl('');
  results: { pieces: any[]; events: any[]; collections: any[] } = { pieces: [], events: [], collections: [] };

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.searchCtrl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(val => val ? this.api.searchAll(val) : of({ pieces: [], events: [], collections: [] }))
    ).subscribe(res => this.results = res);
  }
}
