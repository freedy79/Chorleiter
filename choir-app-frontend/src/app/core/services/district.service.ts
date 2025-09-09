import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreatorService } from './creator.service';
import { District } from '../models/district';

@Injectable({ providedIn: 'root' })
export class DistrictService extends CreatorService<District> {
  constructor(http: HttpClient) { super(http, 'districts'); }

  getDistricts(): Observable<District[]> { return this.getAll(); }
  createDistrict(data: { name: string }): Observable<District> { return this.create(data); }
  deleteDistrict(id: number): Observable<any> { return this.delete(id); }
}
