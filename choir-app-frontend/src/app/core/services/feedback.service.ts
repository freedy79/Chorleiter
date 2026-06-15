import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface ImprovementSuggestionPayload {
  message: string;
}

@Injectable({ providedIn: 'root' })
export class FeedbackService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  submitImprovementSuggestion(payload: ImprovementSuggestionPayload): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/feedback/improvement-suggestions`, payload);
  }
}
