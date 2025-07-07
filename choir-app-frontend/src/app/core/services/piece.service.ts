import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
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
    collectionId?: number,
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
    search?: string
  ): Observable<{ data: Piece[]; total: number }> {
    let params = new HttpParams();
    if (categoryIds && categoryIds.length > 0) {
      params = params.set('categoryIds', categoryIds.join(','));
    }
    if (collectionId) params = params.set('collectionId', collectionId.toString());
    if (sortBy) params = params.set('sortBy', sortBy);
    params = params.set('page', page.toString());
    params = params.set('limit', limit.toString());
    // Avoid sending empty sortDir which causes an empty query parameter
    params = params.set('sortDir', sortDir || 'ASC');
    if (statuses && statuses.length) params = params.set('status', statuses.join(','));
    if (search) params = params.set('search', search);

    return this.http.get<{ data: Piece[]; total: number }>(`${this.apiUrl}/repertoire`, { params });
  }

  updatePieceStatus(pieceId: number, status: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/repertoire/status`, { pieceId, status });
  }

  getGlobalPieces(): Observable<Piece[]> {
    return this.http.get<Piece[]>(`${this.apiUrl}/pieces`);
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
}
