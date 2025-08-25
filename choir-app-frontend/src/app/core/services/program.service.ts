import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Program, ProgramItem } from '../models/program';

@Injectable({ providedIn: 'root' })
export class ProgramService {
  constructor(private http: HttpClient) {}

  createProgram(data: { title: string; description?: string; startTime?: string }): Observable<Program> {
    return this.http.post<Program>('/api/programs', data);
  }

  addPieceItem(
    programId: string,
    data: { pieceId: string; title: string; composer?: string; durationSec?: number; note?: string }
  ): Observable<ProgramItem> {
    return this.http.post<ProgramItem>(`/api/programs/${programId}/items`, data);
  }

  addFreePieceItem(
    programId: string,
    data: {
      title: string;
      composer?: string;
      instrument?: string;
      performerNames?: string;
      durationSec?: number;
      note?: string;
    }
  ): Observable<ProgramItem> {
    return this.http.post<ProgramItem>(`/api/programs/${programId}/items/free`, data);
  }

  addSpeechItem(
    programId: string,
    data: { title: string; source?: string; speaker?: string; text?: string; durationSec?: number; note?: string }
  ): Observable<ProgramItem> {
    return this.http.post<ProgramItem>(`/api/programs/${programId}/items/speech`, data);
  }
}
