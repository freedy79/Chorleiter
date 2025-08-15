import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Category } from '../models/category';
import { CreatorService } from './creator.service';

@Injectable({ providedIn: 'root' })
export class CategoryService extends CreatorService<Category> {
  constructor(http: HttpClient) { super(http, 'categories'); }

  getCategories(collectionIds?: number[]): Observable<Category[]> {
    if (!collectionIds || !collectionIds.length) return this.getAll();
    const params = new HttpParams().set('collectionIds', collectionIds.join(','));
    return this.http.get<Category[]>(this.url(), { params });
  }

  createCategory(name: string, force = false): Observable<Category> {
    return this.create({ name }, force);
  }
}
