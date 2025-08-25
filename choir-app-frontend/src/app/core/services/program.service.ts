import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Program } from '../models/program';

@Injectable({ providedIn: 'root' })
export class ProgramService {
  constructor(private http: HttpClient) {}

  createProgram(data: { title: string; description?: string; startTime?: string }): Observable<Program> {
    return this.http.post<Program>('/api/programs', data);
  }
}
