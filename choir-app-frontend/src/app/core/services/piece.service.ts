import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { Piece } from '../models/piece';
import { LookupPiece } from '../models/lookup-piece';
import { PieceChange } from '../models/piece-change';

@Injectable({
  providedIn: 'root'
})
export class PieceService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getMyRepertoire(
    categoryIds?: number[],
    collectionIds?: number[],
    sortBy?:
      | 'title'
      | 'reference'
      | 'composer'
      | 'category'
      | 'collection'
      | 'lastSung'
      | 'lastRehearsed'
      | 'timesSung'
      | 'timesRehearsed',
    page = 1,
    limit = 25,
    statuses?: string[],
    sortDir: 'ASC' | 'DESC' = 'ASC',
    search?: string,
    licenses?: string[]
  ): Observable<{ data: Piece[]; total: number }> {
    let params = new HttpParams();
    if (categoryIds && categoryIds.length > 0) {
      params = params.set('categoryIds', categoryIds.join(','));
    }
    if (collectionIds && collectionIds.length > 0) {
      params = params.set('collectionIds', collectionIds.join(','));
    }
    if (sortBy) params = params.set('sortBy', sortBy);
    params = params.set('page', page.toString());
    params = params.set('limit', limit.toString());
    // Avoid sending empty sortDir which causes an empty query parameter
    params = params.set('sortDir', sortDir || 'ASC');
    if (statuses && statuses.length) params = params.set('status', statuses.join(','));
    if (search) params = params.set('search', search);
    if (licenses && licenses.length) params = params.set('license', licenses.join(','));

    return this.http.get<{ data: Piece[]; total: number }>(`${this.apiUrl}/repertoire`, { params });
  }

  updatePieceStatus(pieceId: number, status: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/repertoire/status`, { pieceId, status });
  }

  updatePieceNotes(pieceId: number, notes: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/repertoire/notes`, { pieceId, notes });
  }

  updatePieceRating(pieceId: number, rating: number | null): Observable<any> {
    return this.http.put(`${this.apiUrl}/repertoire/rating`, { pieceId, rating });
  }

  getPieceNotes(pieceId: number) {
    return this.http.get(`${this.apiUrl}/repertoire/${pieceId}/notes`);
  }

  addPieceNote(pieceId: number, text: string) {
    return this.http.post(`${this.apiUrl}/repertoire/${pieceId}/notes`, { text });
  }

  updatePieceNote(noteId: number, text: string) {
    return this.http.put(`${this.apiUrl}/repertoire/notes/${noteId}`, { text });
  }

  deletePieceNote(noteId: number) {
    return this.http.delete(`${this.apiUrl}/repertoire/notes/${noteId}`);
  }

  getGlobalPieces(filters?: { composerId?: number; authorId?: number; license?: string[] }): Observable<Piece[]> {
    let params = new HttpParams();
    if (filters?.composerId) {
      params = params.set('composerId', filters.composerId.toString());
    }
    if (filters?.authorId) {
      params = params.set('authorId', filters.authorId.toString());
    }
    if (filters?.license && filters.license.length) {
      params = params.set('license', filters.license.join(','));
    }
    return this.http.get<Piece[]>(`${this.apiUrl}/pieces`, { params });
  }

  createGlobalPiece(pieceData: any): Observable<Piece> {
    return this.http.post<Piece>(`${this.apiUrl}/pieces`, pieceData);
  }

  updateGlobalPiece(id: number, pieceData: any): Observable<Piece> {
    return this.http.put<Piece>(`${this.apiUrl}/pieces/${id}`, pieceData);
  }

  proposePieceChange(id: number, pieceData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/piece-changes`, { pieceId: id, data: pieceData });
  }

  getPieceChangeRequests(): Observable<PieceChange[]> {
    return this.http.get<PieceChange[]>(`${this.apiUrl}/piece-changes`);
  }

  approvePieceChange(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/piece-changes/${id}/approve`, {});
  }

  deletePieceChange(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/piece-changes/${id}`);
  }

  getPieceById(id: number): Observable<Piece> {
    return this.http.get<Piece>(`${this.apiUrl}/pieces/${id}`);
  }

  /**
   * Load a piece from the choir's repertoire including event history.
   */
  getRepertoirePiece(id: number): Observable<Piece> {
    return this.http.get<Piece>(`${this.apiUrl}/repertoire/${id}`);
  }

  addPieceToMyRepertoire(pieceId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/repertoire/add-piece`, { pieceId });
  }

  getRepertoireForLookup(): Observable<LookupPiece[]> {
    return this.http.get<LookupPiece[]>(`${this.apiUrl}/repertoire/lookup`);
  }

  uploadPieceImage(id: number, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('image', file);
    return this.http.post(`${this.apiUrl}/pieces/${id}/image`, formData);
  }

  getPieceImage(id: number): Observable<string> {
    return this.http
      .get<{ data: string }>(`${this.apiUrl}/pieces/${id}/image`)
      .pipe(map(res => res.data));
  }

  uploadPieceLinkFile(file: File): Observable<{ path: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ path: string }>(`${this.apiUrl}/pieces/link-file`, formData);
  }

  deletePieceLinkFile(path: string): Observable<any> {
    return this.http.request('delete', `${this.apiUrl}/pieces/link-file`, { body: { path } });
  }

  reportPiece(pieceId: number, category: string, reason: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/pieces/${pieceId}/report`, { category, reason });
  }
}
