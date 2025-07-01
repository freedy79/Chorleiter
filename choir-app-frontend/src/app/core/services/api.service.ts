import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

// Import all the models your service will interact with
import { Piece } from '../models/piece';
import { Composer } from '../models/composer';
import { Category } from '../models/category';
import { User, UserInChoir } from '../models/user';
import { LoginAttempt } from '../models/login-attempt';
import { CreateEventResponse, Event } from '../models/event';
import { Collection } from '../models/collection';
import { LookupPiece } from '@core/models/lookup-piece';
import { Author } from '@core/models/author';
import { Choir } from '@core/models/choir';
import { PieceChange } from '../models/piece-change';
import { PieceService } from './piece.service';
import { StatsSummary } from '../models/stats-summary';
import { RepertoireFilter } from '../models/repertoire-filter';
import { FilterPresetService } from './filter-preset.service';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient,
              private pieceService: PieceService,
              private filterPresetService: FilterPresetService) {

  }

  // --- Repertoire Methods (Choir-Specific) ---

  /**
   * Gets the list of pieces for the currently logged-in choir, including their specific status.
   * Can be filtered by composer or category.
   * @param composerId - Optional ID of the composer to filter by.
   * @param categoryIds - Optional list of category IDs to filter by.
   */
  getMyRepertoire(
    composerId?: number,
    categoryIds?: number[],
    collectionId?: number,
    sortBy?: 'title' | 'reference' | 'composer' | 'category' | 'collection' |
            'lastSung' | 'lastRehearsed' | 'timesSung' | 'timesRehearsed',
    page: number = 1,
    limit: number = 25,
    status?: string,
    sortDir: 'ASC' | 'DESC' = 'ASC',
    search?: string
  ): Observable<{ data: Piece[]; total: number }> {
    // composerId not yet supported by PieceService, pass as part of search/filter when implemented
    return this.pieceService.getMyRepertoire(
      categoryIds,
      collectionId,
      sortBy,
      page,
      limit,
      status,
      sortDir,
      search
    );
  }

  getRepertoireForLookup(): Observable<LookupPiece[]> {
    return this.pieceService.getRepertoireForLookup();
  }


  /**
   * Updates the status of a specific piece for the current choir.
   * @param pieceId - The ID of the piece to update.
   * @param status - The new status ('CAN_BE_SUNG', 'IN_REHEARSAL', etc.).
   */
  updatePieceStatus(pieceId: number, status: string): Observable<any> {
    return this.pieceService.updatePieceStatus(pieceId, status);
  }


  // --- Global Piece Methods ---

  /**
   * Gets the master list of all pieces in the system, independent of any choir.
   * Useful for lookups when creating collections.
   */
  getGlobalPieces(): Observable<Piece[]> {
    return this.pieceService.getGlobalPieces();
  }

  /**
   * Creates a new piece in the global master list.
   * @param pieceData - The core data for the new piece.
   */
  createGlobalPiece(pieceData: { title: string, composerId: number, categoryId?: number, voicing?: string }): Observable<Piece> {
    return this.pieceService.createGlobalPiece(pieceData);
  }

  updateGlobalPiece(id: number, pieceData: any): Observable<Piece> {
    return this.pieceService.updateGlobalPiece(id, pieceData);
  }

  proposePieceChange(id: number, pieceData: any): Observable<any> {
    return this.pieceService.proposePieceChange(id, pieceData);
  }

  getPieceChangeRequests(): Observable<PieceChange[]> {
    return this.pieceService.getPieceChangeRequests();
  }

  approvePieceChange(id: number): Observable<any> {
    return this.pieceService.approvePieceChange(id);
  }

  deletePieceChange(id: number): Observable<any> {
    return this.pieceService.deletePieceChange(id);
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

  enrichComposer(id: number): Observable<Composer> {
    return this.http.post<Composer>(`${this.apiUrl}/composers/${id}/enrich`, {});
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

  enrichAuthor(id: number): Observable<Author> {
    return this.http.post<Author>(`${this.apiUrl}/authors/${id}/enrich`, {});
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


  createCollection(data: any): Observable<Collection> {
    return this.http.post<Collection>(`${this.apiUrl}/collections`, data);
  }

  // Update an existing collection
  updateCollection(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/collections/${id}`, data);
  }

  uploadCollectionCover(id: number, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('cover', file);
    return this.http.post(`${this.apiUrl}/collections/${id}/cover`, formData);
  }

  getCollectionCover(id: number): Observable<string> {
    return this.http
      .get<{ data: string }>(`${this.apiUrl}/collections/${id}/cover`)
      .pipe(map(res => res.data));
  }

  getCollectionCoverUrl(id: number): string {
    return `${this.apiUrl}/collections/${id}/cover`;
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

  getEvents(type?: 'SERVICE' | 'REHEARSAL'): Observable<Event[]> {
    let params = new HttpParams();
    if (type) params = params.set('type', type);
    return this.http.get<Event[]>(`${this.apiUrl}/events`, { params });
  }

  getEventById(id: number): Observable<Event> {
    return this.http.get<Event>(`${this.apiUrl}/events/${id}`);
  }

  updateEvent(id: number, data: { date: string, type: string, notes?: string, pieceIds: number[] }): Observable<Event> {
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
    return this.pieceService.addPieceToMyRepertoire(pieceId);
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

  uploadEventCsv(file: File, type: 'REHEARSAL' | 'SERVICE', mode: 'preview' | 'import'): Observable<any> {
    const formData = new FormData();
    formData.append('csvfile', file, file.name);
    const params = new HttpParams().set('mode', mode).set('type', type);
    return this.http.post(`${this.apiUrl}/import/events`, formData, { params });
  }

  startEventCsvImport(file: File, type: 'REHEARSAL' | 'SERVICE'): Observable<{ jobId: string }> {
    const formData = new FormData();
    formData.append('csvfile', file, file.name);
    const params = new HttpParams().set('type', type);
    return this.http.post<{ jobId: string }>(`${this.apiUrl}/import/events`, formData, { params });
  }

  // Diese Methode fragt den Status eines Jobs ab
  getImportStatus(jobId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/import/status/${jobId}`);
  }


  getPieceById(id: number): Observable<Piece> {
    return this.pieceService.getPieceById(id);
  }

  getRepertoirePiece(id: number): Observable<Piece> {
    return this.http.get<Piece>(`${this.apiUrl}/repertoire/${id}`);
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

  getInvitation(token: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/invitations/${token}`);
  }

  requestPasswordReset(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/password-reset/request`, { email });
  }

  resetPassword(token: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/password-reset/reset/${token}`, { password });
  }

  completeRegistration(token: string, data: { name: string; password: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/invitations/${token}`, data);
  }

  removeUserFromChoir(userId: number): Observable<any> {
    // Senden der ID im Body mit der DELETE-Methode
    const options = { body: { userId: userId } };
    return this.http.delete(`${this.apiUrl}/choir-management/members`, options);
  }

  // --- Admin Methods ---

  getAdminChoirs(): Observable<Choir[]> {
    return this.http.get<Choir[]>(`${this.apiUrl}/admin/choirs`);
  }

  createChoir(data: { name: string; description?: string; location?: string }): Observable<Choir> {
    return this.http.post<Choir>(`${this.apiUrl}/admin/choirs`, data);
  }

  updateChoir(id: number, data: { name: string; description?: string; location?: string }): Observable<Choir> {
    return this.http.put<Choir>(`${this.apiUrl}/admin/choirs/${id}`, data);
  }

  deleteChoir(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin/choirs/${id}`);
  }

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/admin/users`);
  }

  getUserByEmail(email: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/admin/users/email/${encodeURIComponent(email)}`);
  }

  createUser(data: any): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/admin/users`, data);
  }

  updateUser(id: number, data: any): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/admin/users/${id}`, data);
  }

  deleteUser(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin/users/${id}`);
  }

  sendPasswordReset(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/users/${id}/send-password-reset`, {});
  }

  getLoginAttempts(): Observable<LoginAttempt[]> {
    return this.http.get<LoginAttempt[]>(`${this.apiUrl}/admin/login-attempts`);
  }

  downloadBackup(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/backup/export`, { responseType: 'blob' });
  }

  restoreBackup(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('backup', file);
    return this.http.post(`${this.apiUrl}/backup/import`, formData);
  }

  checkChoirAdminStatus(): Observable<{ isChoirAdmin: boolean }> {
    return this.http.get<{ isChoirAdmin: boolean }>(`${this.apiUrl}/auth/check-choir-admin`);
  }

  getStatistics(): Observable<StatsSummary> {
    return this.http.get<StatsSummary>(`${this.apiUrl}/stats`);
  }

  pingBackend(): Observable<{ message: string }> {
        return this.http.get<{ message: string }>(`${this.apiUrl}/ping`);
    }

  registerDonation(): Observable<any> {
        return this.http.post(`${this.apiUrl}/users/me/donate`, {});
    }

  // --- Filter Preset Methods ---
  getRepertoireFilters(): Observable<RepertoireFilter[]> {
    return this.filterPresetService.getPresets();
  }

  saveRepertoireFilter(preset: { name: string; data: any; visibility: 'personal' | 'local' | 'global' }): Observable<RepertoireFilter> {
    return this.filterPresetService.savePreset(preset);
  }

  deleteRepertoireFilter(id: number): Observable<any> {
    return this.filterPresetService.deletePreset(id);
  }
}
