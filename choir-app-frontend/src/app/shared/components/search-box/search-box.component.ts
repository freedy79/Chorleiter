import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '@core/services/api.service';

@Component({
  selector: 'app-search-box',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search-box.component.html',
  styleUrls: ['./search-box.component.scss']
})
export class SearchBoxComponent {
  query = '';
  @Output() results = new EventEmitter<any[]>();

  constructor(private apiService: ApiService) {}

  onInput(): void {
    const term = this.query.trim();
    if (!term) {
      this.results.emit([]);
      return;
    }
    this.apiService.searchAll(term).subscribe(res => this.results.emit(res));
  }
}
