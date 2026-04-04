import { Injectable } from '@angular/core';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ChatMessage, ChatMessageListResponse } from '@core/models/chat-message';
import { ChatGlobalUnreadOverview, ChatRoom, ChatRoomDetail, ChatUnreadSummary } from '@core/models/chat-room';
import { SKIP_GLOBAL_LOADING } from '@core/interceptors/loading-interceptor';
import { SKIP_GLOBAL_ERROR_REPORTING } from '@core/interceptors/error-interceptor';

export type ChatMessageQuery = {
  before?: string;
  after?: string;
  afterId?: number;
  limit?: number;
};

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly apiUrl = `${environment.apiUrl}/chat`;

  constructor(private http: HttpClient) {}

  getRooms(options?: { silent?: boolean }): Observable<ChatRoom[]> {
    const httpOptions: { context?: HttpContext } = {};
    if (options?.silent) {
      httpOptions.context = new HttpContext()
        .set(SKIP_GLOBAL_LOADING, true)
        .set(SKIP_GLOBAL_ERROR_REPORTING, true);
    }
    return this.http.get<ChatRoom[]>(`${this.apiUrl}/rooms`, httpOptions);
  }

  createRoom(payload: { title: string; key?: string; isPrivate?: boolean; memberUserIds?: number[] }): Observable<ChatRoom> {
    return this.http.post<ChatRoom>(`${this.apiUrl}/rooms`, payload);
  }

  getRoomDetail(roomId: number): Observable<ChatRoomDetail> {
    return this.http.get<ChatRoomDetail>(`${this.apiUrl}/rooms/${roomId}`);
  }

  updateRoom(roomId: number, payload: { title?: string; isPrivate?: boolean; memberUserIds?: number[] }): Observable<ChatRoomDetail> {
    return this.http.put<ChatRoomDetail>(`${this.apiUrl}/rooms/${roomId}`, payload);
  }

  getMessages(roomId: number, query: ChatMessageQuery = {}, options?: { silent?: boolean }): Observable<ChatMessageListResponse> {
    let params = new HttpParams();
    if (query.before) params = params.set('before', query.before);
    if (query.after) params = params.set('after', query.after);
    if (query.afterId) params = params.set('afterId', String(query.afterId));
    if (query.limit) params = params.set('limit', String(query.limit));

    const httpOptions: { params: HttpParams; context?: HttpContext } = { params };
    if (options?.silent) {
      httpOptions.context = new HttpContext()
        .set(SKIP_GLOBAL_LOADING, true)
        .set(SKIP_GLOBAL_ERROR_REPORTING, true);
    }

    return this.http.get<ChatMessageListResponse>(`${this.apiUrl}/rooms/${roomId}/messages`, httpOptions);
  }

  sendMessage(roomId: number, payload: { text?: string; replyToMessageId?: number | null; attachment?: File | null }): Observable<ChatMessage> {
    const formData = new FormData();
    if (payload.text !== undefined) formData.append('text', payload.text);
    if (payload.replyToMessageId !== undefined && payload.replyToMessageId !== null) {
      formData.append('replyToMessageId', String(payload.replyToMessageId));
    }
    if (payload.attachment) formData.append('attachment', payload.attachment);

    return this.http.post<ChatMessage>(`${this.apiUrl}/rooms/${roomId}/messages`, formData);
  }

  editMessage(messageId: number, text: string): Observable<ChatMessage> {
    return this.http.put<ChatMessage>(`${this.apiUrl}/messages/${messageId}`, { text });
  }

  deleteMessage(messageId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/messages/${messageId}`);
  }

  reportMessage(messageId: number, reason: string): Observable<{ id: number; message: string }> {
    return this.http.post<{ id: number; message: string }>(`${this.apiUrl}/messages/${messageId}/report`, { reason });
  }

  markRoomRead(roomId: number, lastReadMessageId?: number): Observable<{ chatRoomId: number; lastReadMessageId: number | null; lastReadAt: string | null }> {
    return this.http.post<{ chatRoomId: number; lastReadMessageId: number | null; lastReadAt: string | null }>(
      `${this.apiUrl}/rooms/${roomId}/read`,
      { lastReadMessageId: lastReadMessageId ?? null }
    );
  }

  getUnreadSummary(): Observable<ChatUnreadSummary> {
    return this.http.get<ChatUnreadSummary>(`${this.apiUrl}/unread-summary`);
  }

  getGlobalUnreadOverview(): Observable<ChatGlobalUnreadOverview> {
    return this.http.get<ChatGlobalUnreadOverview>(`${this.apiUrl}/unread-overview`, {
      context: new HttpContext()
        .set(SKIP_GLOBAL_LOADING, true)
        .set(SKIP_GLOBAL_ERROR_REPORTING, true)
    });
  }

  getMessageById(messageId: number): Observable<ChatMessage & { room: { id: number; key: string; title: string; isPrivate?: boolean } }> {
    return this.http.get<ChatMessage & { room: { id: number; key: string; title: string; isPrivate?: boolean } }>(`${this.apiUrl}/messages/${messageId}`);
  }

  getAttachmentUrl(messageId: number): string {
    return `${this.apiUrl}/messages/${messageId}/attachment`;
  }

  getRoomStreamUrl(roomId: number, afterId?: number): string {
    const base = `${this.apiUrl}/rooms/${roomId}/stream`;
    const params = new URLSearchParams();
    // Prevent Angular Service Worker from intercepting SSE requests.
    // Intercepted event streams can fail because SW fetch handling expects finite responses.
    params.set('ngsw-bypass', 'true');

    if (afterId && !Number.isNaN(afterId) && afterId > 0) {
      params.set('afterId', String(afterId));
    }

    return `${base}?${params.toString()}`;
  }
}
