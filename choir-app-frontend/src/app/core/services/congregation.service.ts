import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreatorService } from './creator.service';
import { Congregation } from '../models/congregation';

@Injectable({ providedIn: 'root' })
export class CongregationService extends CreatorService<Congregation> {
  constructor(http: HttpClient) { super(http, 'congregations'); }

  getCongregations(): Observable<Congregation[]> { return this.getAll(); }
  createCongregation(data: { name: string; districtId: number }): Observable<Congregation> { return this.create(data); }
  updateCongregation(id: number, data: { name: string; districtId: number }): Observable<Congregation> { return this.update(id, data); }
  deleteCongregation(id: number): Observable<any> { return this.delete(id); }
}
