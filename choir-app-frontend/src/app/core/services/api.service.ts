import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

// Import all the models your service will interact with
import { Piece } from '../models/piece';
import { Composer } from '../models/composer';
import { Category } from '../models/category';
import { User, UserInChoir } from '../models/user';
import { CreateEventResponse, Event } from '../models/event';
import { Collection } from '../models/collection';
import { LookupPiece } from '@core/models/lookup-piece';
import { Author } from '@core/models/author';
import { Choir } from '@core/models/choir';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  // --- Repertoire Methods (Choir-Specific) ---

  /**
   * Gets the list of pieces for the currently logged-in choir, including their specific status.
   * Can be filtered by composer or category.
   * @param composerId - Optional ID of the composer to filter by.
   * @param categoryId - Optional ID of the category (Rubrik) to filter by.
   */
  getMyRepertoire(
    composerId?: number,
    categoryId?: number,
    collectionId?: number,
    sortBy?: 'title' | 'reference' | 'composer' | 'category' | 'collection'
  ): Observable<Piece[]> {
    let params = new HttpParams();
    if (composerId) params = params.set('composerId', composerId.toString());
    if (categoryId) params = params.set('categoryId', categoryId.toString());
    if (collectionId) params = params.set('collectionId', collectionId.toString());
    if (sortBy) params = params.set('sortBy', sortBy);

    return this.http.get<Piece[]>(`${this.apiUrl}/repertoire`, { params });
  }

  getRepertoireForLookup(): Observable<LookupPiece[]> {
    return this.http.get<LookupPiece[]>(`${this.apiUrl}/repertoire/lookup`);
  }


  /**
   * Updates the status of a specific piece for the current choir.
   * @param pieceId - The ID of the piece to update.
   * @param status - The new status ('CAN_BE_SUNG', 'IN_REHEARSAL', etc.).
   */
  updatePieceStatus(pieceId: number, status: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/repertoire/status`, { pieceId, status });
  }


  // --- Global Piece Methods ---

  /**
   * Gets the master list of all pieces in the system, independent of any choir.
   * Useful for lookups when creating collections.
   */
  getGlobalPieces(): Observable<Piece[]> {
    return this.http.get<Piece[]>(`${this.apiUrl}/pieces`);
  }

  /**
   * Creates a new piece in the global master list.
   * @param pieceData - The core data for the new piece.
   */
  createGlobalPiece(pieceData: { title: string, composerId: number, categoryId?: number, voicing?: string }): Observable<Piece> {
    return this.http.post<Piece>(`${this.apiUrl}/pieces`, pieceData);
  }


  // --- Composer Methods ---

  getComposers(): Observable<Composer[]> {
    return this.http.get<Composer[]>(`${this.apiUrl}/composers`);
  }

  createComposer(data: { name: string; birthYear?: string; deathYear?: string }): Observable<Composer> {
    return this.http.post<Composer>(`${this.apiUrl}/composers`, data);
  }

  updateComposer(id: number, data: { name: string; birthYear?: string; deathYear?: string }): Observable<Composer> {
    return this.http.put<Composer>(`${this.apiUrl}/composers/${id}`, data);
  }

  deleteComposer(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/composers/${id}`);
  }

  getAuthors(): Observable<Author[]> {
    return this.http.get<Author[]>(`${this.apiUrl}/authors`);
  }

  createAuthor(data: { name: string; birthYear?: string; deathYear?: string }): Observable<Author> {
    return this.http.post<Author>(`${this.apiUrl}/authors`, data);
  }

  updateAuthor(id: number, data: { name: string; birthYear?: string; deathYear?: string }): Observable<Author> {
    return this.http.put<Author>(`${this.apiUrl}/authors/${id}`, data);
  }

  deleteAuthor(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/authors/${id}`);
  }


  // --- Category (Rubrik) Methods ---

  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.apiUrl}/categories`);
  }

  createCategory(name: string): Observable<Category> {
    return this.http.post<Category>(`${this.apiUrl}/categories`, { name });
  }


  // --- Collection Methods ---

   getCollections(): Observable<Collection[]> {
    return this.http.get<Collection[]>(`${this.apiUrl}/collections`);
  }


  getCollectionById(id: number): Observable<Collection> {
    return this.http.get<Collection>(`${this.apiUrl}/collections/${id}`);
  }


  createCollection(data: { title: string, publisher?: string, prefix?: string, pieceIds: number[] }): Observable<Collection> {
    return this.http.post<Collection>(`${this.apiUrl}/collections`, data);
  }

  // Update an existing collection
  updateCollection(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/collections/${id}`, data);
  }


  addCollectionToChoir(collectionId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/collections/${collectionId}/addToChoir`, {});
  }


  // --- Event Methods ---

  /**
   * Gets the most recent event (e.g., 'SERVICE' or 'REHEARSAL') for the current choir.
   * @param type - The type of event to find.
   */
  getLastEvent(type: 'SERVICE' | 'REHEARSAL'): Observable<Event | null> {
    return this.http.get<Event | null>(`${this.apiUrl}/events/last`, {
      params: { type }
    });
  }

  /**
   * Creates a new event (service or rehearsal) for the current choir.
   * @param eventData - The details of the event, including the IDs of the pieces performed.
   */
   createEvent(eventData: { date: string, type: string, notes?: string, pieceIds: number[] }): Observable<CreateEventResponse> {
    // Passen Sie den Rückgabetyp hier an
    return this.http.post<CreateEventResponse>(`${this.apiUrl}/events`, eventData);
  }


  // --- User Methods ---

  /**
   * Gets the profile of the currently logged-in user, including their choir details.
   */
  getCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/me`);
  }

  updateCurrentUser(profileData: { name?: string, email?: string, password?: string }): Observable<any> {
    return this.http.put(`${this.apiUrl}/users/me`, profileData);
  }

  addPieceToMyRepertoire(pieceId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/repertoire/add-piece`, { pieceId });
    }

  uploadCollectionCsv(collectionId: number, file: File, mode: 'preview' | 'import'): Observable<any> {
    const formData = new FormData();
    formData.append('csvfile', file, file.name);

    // Füge den Modus als Query-Parameter hinzu
    const params = new HttpParams().set('mode', mode);

    return this.http.post(`${this.apiUrl}/import/collection/${collectionId}`, formData, { params });
  }

  startCollectionCsvImport(collectionId: number, file: File): Observable<{ jobId: string }> {
    const formData = new FormData();
    formData.append('csvfile', file, file.name);
    return this.http.post<{ jobId: string }>(`${this.apiUrl}/import/collection/${collectionId}`, formData);
  }

  // Diese Methode fragt den Status eines Jobs ab
  getImportStatus(jobId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/import/status/${jobId}`);
  }


  getPieceById(id: number): Observable<Piece> {
    return this.http.get<Piece>(`${this.apiUrl}/pieces/${id}`);
  }

  getMyChoirDetails(): Observable<Choir> {
    return this.http.get<Choir>(`${this.apiUrl}/choir-management`);
  }

  updateMyChoir(choirData: { name: string, description: string, location: string }): Observable<any> {
    return this.http.put(`${this.apiUrl}/choir-management`, choirData);
  }

  getChoirMembers(): Observable<UserInChoir[]> {
    return this.http.get<UserInChoir[]>(`${this.apiUrl}/choir-management/members`);
  }

  inviteUserToChoir(email: string, roleInChoir: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/choir-management/members`, { email, roleInChoir });
  }

  removeUserFromChoir(userId: number): Observable<any> {
    // Senden der ID im Body mit der DELETE-Methode
    const options = { body: { userId: userId } };
    return this.http.delete(`${this.apiUrl}/choir-management/members`, options);
  }

  checkChoirAdminStatus(): Observable<{ isChoirAdmin: boolean }> {
    return this.http.get<{ isChoirAdmin: boolean }>(`${this.apiUrl}/auth/check-choir-admin`);
  }
}
