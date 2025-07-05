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
import { MonthlyPlan } from '../models/monthly-plan';
import { PlanEntry } from '../models/plan-entry';
import { Collection } from '../models/collection';
import { LookupPiece } from '@core/models/lookup-piece';
import { Author } from '@core/models/author';
import { Choir } from '@core/models/choir';
import { PieceChange } from '../models/piece-change';
import { PieceService } from './piece.service';
import { ComposerService } from './composer.service';
import { AuthorService } from './author.service';
import { CategoryService } from './category.service';
import { CollectionService } from './collection.service';
import { EventService } from './event.service';
import { PlanEntryService } from './plan-entry.service';
import { ChoirService } from './choir.service';
import { UserService } from './user.service';
import { ImportService } from './import.service';
import { AdminService } from './admin.service';
import { SystemService } from './system.service';
import { StatsSummary } from '../models/stats-summary';
import { RepertoireFilter } from '../models/repertoire-filter';
import { MailSettings } from '../models/mail-settings';
import { FilterPresetService } from './filter-preset.service';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient,
              private pieceService: PieceService,
              private composerService: ComposerService,
              private authorService: AuthorService,
              private categoryService: CategoryService,
              private collectionService: CollectionService,
              private eventService: EventService,
              private planEntryService: PlanEntryService,
              private choirService: ChoirService,
              private userService: UserService,
              private importService: ImportService,
              private adminService: AdminService,
              private systemService: SystemService,
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
    return this.composerService.getComposers();
  }

  createComposer(data: { name: string; birthYear?: string; deathYear?: string }): Observable<Composer> {
    return this.composerService.createComposer(data);
  }

  updateComposer(id: number, data: { name: string; birthYear?: string; deathYear?: string }): Observable<Composer> {
    return this.composerService.updateComposer(id, data);
  }

  deleteComposer(id: number): Observable<any> {
    return this.composerService.deleteComposer(id);
  }

  enrichComposer(id: number): Observable<Composer> {
    return this.composerService.enrichComposer(id);
  }

  getAuthors(): Observable<Author[]> {
    return this.authorService.getAuthors();
  }

  createAuthor(data: { name: string; birthYear?: string; deathYear?: string }): Observable<Author> {
    return this.authorService.createAuthor(data);
  }

  updateAuthor(id: number, data: { name: string; birthYear?: string; deathYear?: string }): Observable<Author> {
    return this.authorService.updateAuthor(id, data);
  }

  deleteAuthor(id: number): Observable<any> {
    return this.authorService.deleteAuthor(id);
  }

  enrichAuthor(id: number): Observable<Author> {
    return this.authorService.enrichAuthor(id);
  }


  // --- Category (Rubrik) Methods ---

  getCategories(): Observable<Category[]> {
    return this.categoryService.getCategories();
  }

  createCategory(name: string): Observable<Category> {
    return this.categoryService.createCategory(name);
  }


  // --- Collection Methods ---

  getCollections(): Observable<Collection[]> {
    return this.collectionService.getCollections();
  }


  getCollectionById(id: number): Observable<Collection> {
    return this.collectionService.getCollectionById(id);
  }


  createCollection(data: any): Observable<Collection> {
    return this.collectionService.createCollection(data);
  }

  // Update an existing collection
  updateCollection(id: number, data: any): Observable<any> {
    return this.collectionService.updateCollection(id, data);
  }

  uploadCollectionCover(id: number, file: File): Observable<any> {
    return this.collectionService.uploadCollectionCover(id, file);
  }

  getCollectionCover(id: number): Observable<string> {
    return this.collectionService.getCollectionCover(id);
  }

  getCollectionCoverUrl(id: number): string {
    return this.collectionService.getCollectionCoverUrl(id);
  }


  addCollectionToChoir(collectionId: number): Observable<any> {
    return this.collectionService.addCollectionToChoir(collectionId);
  }


  // --- Event Methods ---

  /**
   * Gets the most recent event (e.g., 'SERVICE' or 'REHEARSAL') for the current choir.
   * @param type - The type of event to find.
   */
  getLastEvent(type: 'SERVICE' | 'REHEARSAL'): Observable<Event | null> {
    return this.eventService.getLastEvent(type);
  }

  /**
   * Creates a new event (service or rehearsal) for the current choir.
   * @param eventData - The details of the event, including the IDs of the pieces performed.
   */
  createEvent(eventData: { date: string, type: string, notes?: string, pieceIds?: number[], directorId?: number, organistId?: number, finalized?: boolean, version?: number, monthlyPlanId?: number }): Observable<CreateEventResponse> {
    return this.eventService.createEvent(eventData);
  }

  getEvents(type?: 'SERVICE' | 'REHEARSAL'): Observable<Event[]> {
    return this.eventService.getEvents(type);
  }

  getEventById(id: number): Observable<Event> {
    return this.eventService.getEventById(id);
  }

  updateEvent(id: number, data: { date: string, type: string, notes?: string, pieceIds?: number[]; directorId?: number; organistId?: number; finalized?: boolean; version?: number; monthlyPlanId?: number }): Observable<Event> {
    return this.eventService.updateEvent(id, data);
  }

  deleteEvent(id: number): Observable<any> {
    return this.eventService.deleteEvent(id);
  }

  deleteEventsInRange(start: string, end: string, type?: 'SERVICE' | 'REHEARSAL'): Observable<any> {
    return this.eventService.deleteEventsInRange(start, end, type);
  }

  // --- Plan Entry Methods ---
  createPlanEntry(data: { monthlyPlanId: number; date: string; type: string; notes?: string; directorId?: number; organistId?: number }): Observable<PlanEntry> {
    return this.planEntryService.createPlanEntry(data);
  }

  updatePlanEntry(id: number, data: { date: string; type: string; notes?: string; directorId?: number; organistId?: number }): Observable<PlanEntry> {
    return this.planEntryService.updatePlanEntry(id, data);
  }

  deletePlanEntry(id: number): Observable<any> {
    return this.planEntryService.deletePlanEntry(id);
  }

  // --- Monthly Plan Methods ---
  getMonthlyPlan(year: number, month: number): Observable<MonthlyPlan | null> {
    return this.http.get<MonthlyPlan | null>(`${this.apiUrl}/monthly-plans/${year}/${month}`);
  }

  createMonthlyPlan(year: number, month: number): Observable<MonthlyPlan> {
    return this.http.post<MonthlyPlan>(`${this.apiUrl}/monthly-plans`, { year, month });
  }

  finalizeMonthlyPlan(id: number): Observable<MonthlyPlan> {
    return this.http.put<MonthlyPlan>(`${this.apiUrl}/monthly-plans/${id}/finalize`, {});
  }

  reopenMonthlyPlan(id: number): Observable<MonthlyPlan> {
    return this.http.put<MonthlyPlan>(`${this.apiUrl}/monthly-plans/${id}/reopen`, {});
  }


  // --- User Methods ---

  /**
   * Gets the profile of the currently logged-in user, including their choir details.
   */
  getCurrentUser(): Observable<User> {
    return this.userService.getCurrentUser();
  }

  updateCurrentUser(profileData: { name?: string, email?: string, password?: string }): Observable<any> {
    return this.userService.updateCurrentUser(profileData);
  }

  addPieceToMyRepertoire(pieceId: number): Observable<any> {
    return this.pieceService.addPieceToMyRepertoire(pieceId);
    }

  uploadCollectionCsv(collectionId: number, file: File, mode: 'preview' | 'import'): Observable<any> {
    return this.importService.uploadCollectionCsv(collectionId, file, mode);
  }

  startCollectionCsvImport(collectionId: number, file: File): Observable<{ jobId: string }> {
    return this.importService.startCollectionCsvImport(collectionId, file);
  }

  uploadEventCsv(file: File, type: 'REHEARSAL' | 'SERVICE', mode: 'preview' | 'import'): Observable<any> {
    return this.importService.uploadEventCsv(file, type, mode);
  }

  startEventCsvImport(file: File, type: 'REHEARSAL' | 'SERVICE'): Observable<{ jobId: string }> {
    return this.importService.startEventCsvImport(file, type);
  }

  // Diese Methode fragt den Status eines Jobs ab
  getImportStatus(jobId: string): Observable<any> {
    return this.importService.getImportStatus(jobId);
  }


  getPieceById(id: number): Observable<Piece> {
    return this.pieceService.getPieceById(id);
  }

  getRepertoirePiece(id: number): Observable<Piece> {
    return this.pieceService.getPieceById(id); // using pieceService for single piece
  }

  getMyChoirDetails(): Observable<Choir> {
    return this.choirService.getMyChoirDetails();
  }

  updateMyChoir(choirData: Partial<Choir>): Observable<any> {
    return this.choirService.updateMyChoir(choirData);
  }

  getChoirMembers(): Observable<UserInChoir[]> {
    return this.choirService.getChoirMembers();
  }

  inviteUserToChoir(email: string, roleInChoir: string, isOrganist?: boolean): Observable<{ message: string }> {
    return this.choirService.inviteUserToChoir(email, roleInChoir, isOrganist);
  }

  updateChoirMember(userId: number, data: { roleInChoir?: string; isOrganist?: boolean }): Observable<any> {
    return this.choirService.updateMember(userId, data);
  }

  getInvitation(token: string): Observable<any> {
    return this.userService.getInvitation(token);
  }

  requestPasswordReset(email: string): Observable<any> {
    return this.userService.requestPasswordReset(email);
  }

  resetPassword(token: string, password: string): Observable<any> {
    return this.userService.resetPassword(token, password);
  }

  completeRegistration(token: string, data: { name: string; password: string; isOrganist?: boolean }): Observable<any> {
    return this.userService.completeRegistration(token, data);
  }

  removeUserFromChoir(userId: number): Observable<any> {
    return this.choirService.removeUserFromChoir(userId);
  }

  getChoirCollections(): Observable<Collection[]> {
    return this.choirService.getChoirCollections();
  }

  removeCollectionFromChoir(collectionId: number): Observable<any> {
    return this.choirService.removeCollectionFromChoir(collectionId);
  }

  // --- Admin Methods ---

  getAdminChoirs(): Observable<Choir[]> {
    return this.adminService.getAdminChoirs();
  }

  createChoir(data: { name: string; description?: string; location?: string }): Observable<Choir> {
    return this.adminService.createChoir(data);
  }

  updateChoir(id: number, data: { name: string; description?: string; location?: string }): Observable<Choir> {
    return this.adminService.updateChoir(id, data);
  }

  deleteChoir(id: number): Observable<any> {
    return this.adminService.deleteChoir(id);
  }

  getChoirMembersAdmin(id: number): Observable<UserInChoir[]> {
    return this.adminService.getChoirMembersAdmin(id);
  }

  inviteUserToChoirAdmin(id: number, email: string, roleInChoir: string, isOrganist?: boolean): Observable<{ message: string }> {
    return this.adminService.inviteUserToChoirAdmin(id, email, roleInChoir, isOrganist);
  }

  updateChoirMemberAdmin(id: number, userId: number, data: { roleInChoir?: string; isOrganist?: boolean }): Observable<any> {
    return this.adminService.updateChoirMemberAdmin(id, userId, data);
  }

  removeUserFromChoirAdmin(id: number, userId: number): Observable<any> {
    return this.adminService.removeUserFromChoirAdmin(id, userId);
  }

  getUsers(): Observable<User[]> {
    return this.adminService.getUsers();
  }

  getUserByEmail(email: string): Observable<User> {
    return this.adminService.getUserByEmail(email);
  }

  createUser(data: any): Observable<User> {
    return this.adminService.createUser(data);
  }

  updateUser(id: number, data: any): Observable<User> {
    return this.adminService.updateUser(id, data);
  }

  deleteUser(id: number): Observable<any> {
    return this.adminService.deleteUser(id);
  }

  sendPasswordReset(id: number): Observable<any> {
    return this.adminService.sendPasswordReset(id);
  }

  getLoginAttempts(): Observable<LoginAttempt[]> {
    return this.adminService.getLoginAttempts();
  }

  listLogs(): Observable<string[]> {
    return this.adminService.listLogs();
  }

  getLog(filename: string): Observable<any[]> {
    return this.adminService.getLog(filename);
  }

  deleteLog(filename: string): Observable<any> {
    return this.adminService.deleteLog(filename);
  }

  downloadBackup(): Observable<Blob> {
    return this.adminService.downloadBackup();
  }

  restoreBackup(file: File): Observable<any> {
    return this.adminService.restoreBackup(file);
  }

  getMailSettings(): Observable<MailSettings> {
    return this.adminService.getMailSettings();
  }

  updateMailSettings(data: MailSettings): Observable<MailSettings> {
    return this.adminService.updateMailSettings(data);
  }

  checkChoirAdminStatus(): Observable<{ isChoirAdmin: boolean }> {
    return this.adminService.checkChoirAdminStatus();
  }

  getStatistics(): Observable<StatsSummary> {
    return this.adminService.getStatistics();
  }

  pingBackend(): Observable<{ message: string }> {
        return this.systemService.pingBackend();
    }

  registerDonation(): Observable<any> {
        return this.userService.registerDonation();
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
