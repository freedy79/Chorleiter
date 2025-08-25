import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Program, ProgramItem } from '../models/program';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class ProgramService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  createProgram(data: { title: string; description?: string; startTime?: string }): Observable<Program> {
    return this.http.post<Program>(`${this.apiUrl}/programs`, data);
  }

  getPrograms(): Observable<Program[]> {
    return this.http.get<Program[]>(`${this.apiUrl}/programs`);
  }

  getProgram(id: string): Observable<Program> {
    return this.http.get<Program>(`${this.apiUrl}/programs/${id}`);
  }

  addPieceItem(
    programId: string,
    data: { pieceId: string; title: string; composer?: string; durationSec?: number; note?: string; slotId?: string }
  ): Observable<ProgramItem> {
    return this.http.post<ProgramItem>(`${this.apiUrl}/programs/${programId}/items`, data);
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
      slotId?: string;
    }
  ): Observable<ProgramItem> {
    return this.http.post<ProgramItem>(`${this.apiUrl}/programs/${programId}/items/free`, data);
  }

  addSpeechItem(
    programId: string,
    data: {
      title: string;
      source?: string;
      speaker?: string;
      text?: string;
      durationSec?: number;
      note?: string;
      slotId?: string;
    }
  ): Observable<ProgramItem> {
    return this.http.post<ProgramItem>(`${this.apiUrl}/programs/${programId}/items/speech`, data);
  }

  addBreakItem(
    programId: string,
    data: { durationSec: number; note?: string; slotId?: string }
  ): Observable<ProgramItem> {
    return this.http.post<ProgramItem>(`${this.apiUrl}/programs/${programId}/items/break`, data);
  }

  addSlotItem(
    programId: string,
    data: { label: string; note?: string }
  ): Observable<ProgramItem> {
    return this.http.post<ProgramItem>(`${this.apiUrl}/programs/${programId}/items/slot`, data);
  }

  reorderItems(programId: string, order: string[]): Observable<ProgramItem[]> {
    return this.http.put<ProgramItem[]>(`${this.apiUrl}/programs/${programId}/items/reorder`, { order });
  }
}
