import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MaterialModule } from '@modules/material.module';
import { SearchService } from '@core/services/search.service';
import { Piece } from '@core/models/piece';
import { Event } from '@core/models/event';
import { Collection } from '@core/models/collection';

@Component({
  selector: 'app-search-results',
  standalone: true,
  imports: [CommonModule, MaterialModule, RouterModule],
  templateUrl: './search-results.component.html',
  styleUrls: ['./search-results.component.scss']
})
export class SearchResultsComponent implements OnInit {
  query = '';
  results: { pieces: Piece[]; events: Event[]; collections: Collection[] } = { pieces: [], events: [], collections: [] };

  constructor(private route: ActivatedRoute, private search: SearchService) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      this.query = params.get('q') || '';
      if (this.query) {
        this.search.searchAll(this.query).subscribe(res => this.results = res);
      } else {
        this.results = { pieces: [], events: [], collections: [] };
      }
    });
  }
}
