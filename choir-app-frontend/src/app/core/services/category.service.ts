import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Category } from '../models/category';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getCategories(collectionIds?: number[]): Observable<Category[]> {
    let params = new HttpParams();
    if (collectionIds && collectionIds.length) {
      params = params.set('collectionIds', collectionIds.join(','));
    }
    return this.http.get<Category[]>(`${this.apiUrl}/categories`, { params });
  }

  createCategory(name: string): Observable<Category> {
    return this.http.post<Category>(`${this.apiUrl}/categories`, { name });
  }
}
