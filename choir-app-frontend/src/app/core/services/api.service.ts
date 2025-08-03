import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

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
import { Publisher } from '@core/models/publisher';
import { Choir } from '@core/models/choir';
import { PlanRule } from '@core/models/plan-rule';
import { PieceChange } from '../models/piece-change';
import { Post } from '../models/post';
import { LibraryItem } from '../models/library-item';
import { PieceService } from './piece.service';
import { ComposerService } from './composer.service';
import { AuthorService } from './author.service';
import { PublisherService } from './publisher.service';
import { CategoryService } from './category.service';
import { CollectionService } from './collection.service';
import { EventService } from './event.service';
import { PlanEntryService } from './plan-entry.service';
import { ChoirService } from './choir.service';
import { UserService } from './user.service';
import { ImportService } from './import.service';
import { AdminService } from './admin.service';
import { SystemService } from './system.service';
import { PlanRuleService } from './plan-rule.service';
import { StatsSummary } from '../models/stats-summary';
import { RepertoireFilter } from '../models/repertoire-filter';
import { MailSettings } from '../models/mail-settings';
import { MailTemplate } from '../models/mail-template';
import { FrontendUrl } from '../models/frontend-url';
import { FilterPresetService } from './filter-preset.service';
import { UserAvailability } from '../models/user-availability';
import { MemberAvailability } from '../models/member-availability';
import { AvailabilityService } from './availability.service';
import { SearchService } from './search.service';
import { MonthlyPlanService } from './monthly-plan.service';
import { PostService } from './post.service';
import { LibraryService } from './library.service';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  constructor(
              private pieceService: PieceService,
              private composerService: ComposerService,
              private authorService: AuthorService,
              private publisherService: PublisherService,
              private categoryService: CategoryService,
              private collectionService: CollectionService,
              private eventService: EventService,
              private planEntryService: PlanEntryService,
              private choirService: ChoirService,
              private userService: UserService,
              private importService: ImportService,
              private adminService: AdminService,
              private systemService: SystemService,
              private filterPresetService: FilterPresetService,
              private planRuleService: PlanRuleService,
              private availabilityService: AvailabilityService,
              private searchService: SearchService,
              private monthlyPlanService: MonthlyPlanService,
              private postService: PostService,
              private libraryService: LibraryService) {

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
    page: number = 1,
    limit: number = 25,
    statuses?: string[],
    sortDir: 'ASC' | 'DESC' = 'ASC',
    search?: string
  ): Observable<{ data: Piece[]; total: number }> {
    // composerId not yet supported by PieceService, pass as part of search/filter when implemented
    return this.pieceService.getMyRepertoire(
      categoryIds,
      collectionIds,
      sortBy,
      page,
      limit,
      statuses,
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

  updatePieceNotes(pieceId: number, notes: string): Observable<any> {
    return this.pieceService.updatePieceNotes(pieceId, notes);
  }

  getPieceNotes(pieceId: number) {
    return this.pieceService.getPieceNotes(pieceId);
  }

  addPieceNote(pieceId: number, text: string) {
    return this.pieceService.addPieceNote(pieceId, text);
  }

  updatePieceNote(noteId: number, text: string) {
    return this.pieceService.updatePieceNote(noteId, text);
  }

  deletePieceNote(noteId: number) {
    return this.pieceService.deletePieceNote(noteId);
  }


  // --- Global Piece Methods ---

  /**
   * Gets the master list of all pieces in the system, independent of any choir.
   * Useful for lookups when creating collections.
   */
  getGlobalPieces(filters?: { composerId?: number; authorId?: number }): Observable<Piece[]> {
    return this.pieceService.getGlobalPieces(filters);
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
    return this.pieceService.uploadPieceImage(id, file);
  }

  getPieceImage(id: number): Observable<string> {
    return this.pieceService.getPieceImage(id);
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

  createComposer(data: { name: string; birthYear?: string; deathYear?: string }, force = false): Observable<Composer> {
    return this.composerService.createComposer(data, force);
  }

  updateComposer(id: number, data: { name: string; birthYear?: string; deathYear?: string }, force = false): Observable<Composer> {
    return this.composerService.updateComposer(id, data, force);
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

  createAuthor(data: { name: string; birthYear?: string; deathYear?: string }, force = false): Observable<Author> {
    return this.authorService.createAuthor(data, force);
  }

  updateAuthor(id: number, data: { name: string; birthYear?: string; deathYear?: string }, force = false): Observable<Author> {
    return this.authorService.updateAuthor(id, data, force);
  }

  deleteAuthor(id: number): Observable<any> {
    return this.authorService.deleteAuthor(id);
  }

  enrichAuthor(id: number): Observable<Author> {
    return this.authorService.enrichAuthor(id);
  }

  // --- Publisher Methods ---
  getPublishers(): Observable<Publisher[]> {
    return this.publisherService.getPublishers();
  }

  createPublisher(data: { name: string }): Observable<Publisher> {
    return this.publisherService.createPublisher(data);
  }

  updatePublisher(id: number, data: { name: string }): Observable<Publisher> {
    return this.publisherService.updatePublisher(id, data);
  }

  deletePublisher(id: number): Observable<any> {
    return this.publisherService.deletePublisher(id);
  }


  // --- Category (Rubrik) Methods ---

  getCategories(collectionIds?: number[]): Observable<Category[]> {
    return this.categoryService.getCategories(collectionIds);
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

  // Updates an existing collection
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

  searchAll(term: string): Observable<{ pieces: Piece[]; events: Event[]; collections: Collection[] }> {
    return this.searchService.searchAll(term);
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

  getNextEvents(limit?: number, mine?: boolean): Observable<Event[]> {
    return this.eventService.getNextEvents(limit, !!mine);
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
  createPlanEntry(data: { monthlyPlanId: number; date: string; notes?: string; directorId?: number | null; organistId?: number | null }): Observable<PlanEntry> {
    return this.planEntryService.createPlanEntry(data);
  }

  updatePlanEntry(id: number, data: { date: string; notes?: string; directorId?: number | null; organistId?: number | null }): Observable<PlanEntry> {
    return this.planEntryService.updatePlanEntry(id, data);
  }

  deletePlanEntry(id: number): Observable<any> {
    return this.planEntryService.deletePlanEntry(id);
  }

  // --- Monthly Plan Methods ---
  getMonthlyPlan(year: number, month: number): Observable<MonthlyPlan | null> {
    return this.monthlyPlanService.getMonthlyPlan(year, month);
  }

  createMonthlyPlan(year: number, month: number): Observable<MonthlyPlan> {
    return this.monthlyPlanService.createMonthlyPlan(year, month);
  }

  finalizeMonthlyPlan(id: number): Observable<MonthlyPlan> {
    return this.monthlyPlanService.finalizeMonthlyPlan(id);
  }

  reopenMonthlyPlan(id: number): Observable<MonthlyPlan> {
    return this.monthlyPlanService.reopenMonthlyPlan(id);
  }

  downloadMonthlyPlanPdf(id: number): Observable<Blob> {
    return this.monthlyPlanService.downloadMonthlyPlanPdf(id);
  }

  emailMonthlyPlan(id: number, recipients: number[]): Observable<any> {
    return this.monthlyPlanService.emailMonthlyPlan(id, recipients);
  }

  requestAvailability(id: number, recipients: number[]): Observable<any> {
    return this.monthlyPlanService.requestAvailability(id, recipients);
  }

  // --- Plan Rule Methods ---
  getPlanRules(options?: { choirId?: number }): Observable<PlanRule[]> {
    return this.planRuleService.getPlanRules(options?.choirId);
  }

  createPlanRule(
    data: { dayOfWeek: number; weeks?: number[] | null; notes?: string | null },
    options?: { choirId?: number }
  ): Observable<PlanRule> {
    return this.planRuleService.createPlanRule(data, options?.choirId);
  }

  updatePlanRule(
    id: number,
    data: { dayOfWeek: number; weeks?: number[] | null; notes?: string | null },
    options?: { choirId?: number }
  ): Observable<PlanRule> {
    return this.planRuleService.updatePlanRule(id, data, options?.choirId);
  }

  deletePlanRule(id: number, options?: { choirId?: number }): Observable<any> {
    return this.planRuleService.deletePlanRule(id, options?.choirId);
  }

  // --- Availability Methods ---
  getAvailabilities(year: number, month: number): Observable<UserAvailability[]> {
    return this.availabilityService.getAvailabilities(year, month);
  }

  setAvailability(date: string, status: string): Observable<UserAvailability> {
    return this.availabilityService.setAvailability(date, status);
  }

  getMemberAvailabilities(year: number, month: number): Observable<MemberAvailability[]> {
    return this.availabilityService.getMemberAvailabilities(year, month);
  }


  // --- User Methods ---

  /**
   * Gets the profile of the currently logged-in user, including their choir details.
   */
  getCurrentUser(): Observable<User> {
    return this.userService.getCurrentUser();
  }

  updateCurrentUser(profileData: { name?: string; email?: string; street?: string; postalCode?: string; city?: string; shareWithChoir?: boolean; oldPassword?: string; newPassword?: string }): Observable<any> {
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
    return this.pieceService.getRepertoirePiece(id);
  }

  // --- Library ---
  getLibraryItems(): Observable<LibraryItem[]> {
    return this.libraryService.getLibraryItems();
  }

  importLibraryCsv(file: File): Observable<any> {
    return this.libraryService.importCsv(file);
  }

  addLibraryItem(data: { pieceId: number; collectionId: number; copies: number; isBorrowed?: boolean }): Observable<LibraryItem> {
    return this.libraryService.addItem(data);
  }

  borrowLibraryItem(id: number): Observable<any> {
    return this.libraryService.borrowItem(id);
  }

  getMyChoirDetails(options?: { choirId?: number }): Observable<Choir> {
    return this.choirService.getMyChoirDetails(options?.choirId);
  }

  updateMyChoir(choirData: Partial<Choir>, options?: { choirId?: number }): Observable<any> {
    return this.choirService.updateMyChoir(choirData, options?.choirId);
  }

  getChoirMembers(options?: { choirId?: number }): Observable<UserInChoir[]> {
    return this.choirService.getChoirMembers(options?.choirId);
  }

  inviteUserToChoir(
    email: string,
    rolesInChoir: string[],
    options?: { choirId?: number }
  ): Observable<{ message: string }> {
    return this.choirService.inviteUserToChoir(email, rolesInChoir, options?.choirId);
  }

  updateChoirMember(
    userId: number,
    data: { rolesInChoir?: string[] },
    options?: { choirId?: number }
  ): Observable<any> {
    return this.choirService.updateMember(userId, data, options?.choirId);
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

  completeRegistration(token: string, data: { name: string; password: string }): Observable<any> {
    return this.userService.completeRegistration(token, data);
  }

  getJoinInfo(token: string): Observable<any> {
    return this.userService.getJoinInfo(token);
  }

  joinChoir(token: string, data: { name: string; email: string; password: string }): Observable<any> {
    return this.userService.joinChoir(token, data);
  }

  removeUserFromChoir(userId: number, options?: { choirId?: number }): Observable<any> {
    return this.choirService.removeUserFromChoir(userId, options?.choirId);
  }

  getChoirCollections(options?: { choirId?: number }): Observable<Collection[]> {
    return this.choirService.getChoirCollections(options?.choirId);
  }

  removeCollectionFromChoir(collectionId: number, options?: { choirId?: number }): Observable<any> {
    return this.choirService.removeCollectionFromChoir(collectionId, options?.choirId);
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

  inviteUserToChoirAdmin(id: number, email: string, rolesInChoir: string[]): Observable<{ message: string }> {
    return this.adminService.inviteUserToChoirAdmin(id, email, rolesInChoir);
  }

  updateChoirMemberAdmin(id: number, userId: number, data: { rolesInChoir?: string[] }): Observable<any> {
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

  getLoginAttempts(year?: number, month?: number): Observable<LoginAttempt[]> {
    return this.adminService.getLoginAttempts(year, month);
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

  sendTestMail(data?: MailSettings): Observable<{ message: string }> {
    return this.adminService.sendTestMail(data);
  }

  sendTemplateTest(type: string): Observable<{ message: string }> {
    return this.adminService.sendTemplateTest(type);
  }

  getMailTemplates(): Observable<MailTemplate[]> {
    return this.adminService.getMailTemplates();
  }

  updateMailTemplates(data: MailTemplate[]): Observable<MailTemplate[]> {
    return this.adminService.updateMailTemplates(data);
  }

  getFrontendUrl(): Observable<FrontendUrl> {
    return this.adminService.getFrontendUrl();
  }

  updateFrontendUrl(value: string): Observable<FrontendUrl> {
    return this.adminService.updateFrontendUrl({ value });
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

  // --- Post Methods ---
  getPosts(): Observable<Post[]> {
    return this.postService.getPosts();
  }

  getLatestPost(): Observable<Post | null> {
    return this.postService.getLatestPost();
  }

  createPost(data: { title: string; text: string }): Observable<Post> {
    return this.postService.createPost(data);
  }

  updatePost(id: number, data: { title: string; text: string }): Observable<Post> {
    return this.postService.updatePost(id, data);
  }

  deletePost(id: number): Observable<any> {
    return this.postService.deletePost(id);
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
