import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { CreateEventResponse, Event } from '../models/event';

@Injectable({ providedIn: 'root' })
export class EventService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getLastEvent(type: 'SERVICE' | 'REHEARSAL'): Observable<Event | null> {
    return this.http.get<Event | null>(`${this.apiUrl}/events/last`, {
      params: { type }
    });
  }

  createEvent(eventData: { date: string; type: string; notes?: string; pieceIds?: number[]; directorId?: number; organistId?: number; finalized?: boolean; version?: number; monthlyPlanId?: number }): Observable<CreateEventResponse> {
    return this.http.post<CreateEventResponse>(`${this.apiUrl}/events`, eventData);
  }

  getEvents(type?: 'SERVICE' | 'REHEARSAL'): Observable<Event[]> {
    let params = new HttpParams();
    if (type) params = params.set('type', type);
    return this.http.get<Event[]>(`${this.apiUrl}/events`, { params });
  }

  getNextEvents(limit: number = 5, mine: boolean = false): Observable<Event[]> {
    let params = new HttpParams().set('limit', limit);
    if (mine) params = params.set('mine', 'true');
    return this.http.get<Event[]>(`${this.apiUrl}/events/next`, { params });
  }

  getEventById(id: number): Observable<Event> {
    return this.http.get<Event>(`${this.apiUrl}/events/${id}`);
  }

  updateEvent(id: number, data: { date: string; type: string; notes?: string; pieceIds?: number[]; directorId?: number; organistId?: number; finalized?: boolean; version?: number; monthlyPlanId?: number }): Observable<Event> {
    return this.http.put<Event>(`${this.apiUrl}/events/${id}`, data);
  }

  deleteEvent(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/events/${id}`);
  }

  deleteEventsInRange(start: string, end: string, type?: 'SERVICE' | 'REHEARSAL'): Observable<any> {
    let params = new HttpParams().set('start', start).set('end', end);
    if (type) params = params.set('type', type);
    return this.http.delete(`${this.apiUrl}/events/range`, { params });
  }
}
