import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Piece } from '../models/piece';
import { LookupPiece } from '../models/lookup-piece';

@Injectable({
  providedIn: 'root'
})
export class PieceService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getMyRepertoire(
    categoryId?: number,
    collectionId?: number,
    sortBy?: 'title' | 'reference' | 'composer' | 'category' | 'collection',
    page = 1,
    limit = 25,
    status?: string,
    sortDir: 'ASC' | 'DESC' = 'ASC',
    search?: string
  ): Observable<{ data: Piece[]; total: number }> {
    let params = new HttpParams();
    if (categoryId) params = params.set('categoryId', categoryId.toString());
    if (collectionId) params = params.set('collectionId', collectionId.toString());
    if (sortBy) params = params.set('sortBy', sortBy);
    params = params.set('page', page);
    params = params.set('limit', limit);
    params = params.set('sortDir', sortDir);
    if (status) params = params.set('status', status);
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

  getPieceById(id: number): Observable<Piece> {
    return this.http.get<Piece>(`${this.apiUrl}/pieces/${id}`);
  }

  addPieceToMyRepertoire(pieceId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/repertoire/add-piece`, { pieceId });
  }

  getRepertoireForLookup(): Observable<LookupPiece[]> {
    return this.http.get<LookupPiece[]>(`${this.apiUrl}/repertoire/lookup`);
  }
}
