import { Injectable } from '@angular/core';
import { Observable, interval, of, Subscription } from 'rxjs';
import { catchError, map, startWith, switchMap } from 'rxjs/operators';

import { ChatService } from './chat.service';
import { ChatMessage } from '@core/models/chat-message';

export interface ChatRealtimeUpdate {
  messages: ChatMessage[];
  hadError: boolean;
  transport: 'polling' | 'sse' | 'websocket';
  allReadUpToId?: number | null;
}

@Injectable({ providedIn: 'root' })
export class ChatRealtimeService {
  // Current MVP transport. By keeping this in one place,
  // migration to SSE/WebSocket later only changes this service.
  private readonly defaultPollIntervalMs = 7000;

  constructor(private chatService: ChatService) {}

  watchRoom(
    roomId: number,
    getAfterId: () => number | undefined,
    pollIntervalMs?: number
  ): Observable<ChatRealtimeUpdate> {
    if (typeof EventSource !== 'undefined') {
      return this.watchRoomViaSse(roomId, getAfterId, pollIntervalMs);
    }

    return this.watchRoomViaPolling(roomId, getAfterId, pollIntervalMs);
  }

  private watchRoomViaPolling(
    roomId: number,
    getAfterId: () => number | undefined,
    pollIntervalMs?: number
  ): Observable<ChatRealtimeUpdate> {
    const effectiveInterval = pollIntervalMs ?? this.defaultPollIntervalMs;

    return interval(effectiveInterval).pipe(
      startWith(0),
      switchMap(() => {
        const afterId = getAfterId();
        return this.chatService.getMessages(roomId, { afterId, limit: 50 }, { silent: true }).pipe(
          map(response => {
            const recommended = response.realtime?.recommendedRetryMs;
            if (typeof recommended === 'number' && recommended > 0) {
              // Reserved for future dynamic polling cadence.
              void recommended;
            }
            return {
              messages: response.messages,
              hadError: false,
              transport: 'polling' as const,
              allReadUpToId: response.allReadUpToId ?? null
            };
          }),
          catchError(() => of({
            messages: [],
            hadError: true,
            transport: 'polling' as const
          }))
        );
      })
    );
  }

  private watchRoomViaSse(
    roomId: number,
    getAfterId: () => number | undefined,
    pollIntervalMs?: number
  ): Observable<ChatRealtimeUpdate> {
    return new Observable<ChatRealtimeUpdate>(subscriber => {
      let fallbackSub: Subscription | null = null;
      let source: EventSource | null = null;
      let fallbackActive = false;

      const startPollingFallback = () => {
        if (fallbackActive) return;
        fallbackActive = true;
        fallbackSub = this.watchRoomViaPolling(roomId, getAfterId, pollIntervalMs)
          .subscribe(update => subscriber.next(update));
      };

      try {
        const streamUrl = this.chatService.getRoomStreamUrl(roomId, getAfterId());
        source = new EventSource(streamUrl, { withCredentials: true });

        source.addEventListener('message', (event: MessageEvent) => {
          try {
            const payload = JSON.parse(event.data) as ChatMessage;
            subscriber.next({
              messages: [payload],
              hadError: false,
              transport: 'sse'
            });
          } catch {
            // Ignore malformed SSE payloads and let fallback logic handle repeated issues.
          }
        });

        source.addEventListener('heartbeat', (event: MessageEvent) => {
          let allReadUpToId: number | null = null;
          try {
            const data = JSON.parse(event.data);
            allReadUpToId = data.allReadUpToId ?? null;
          } catch { /* ignore */ }
          subscriber.next({
            messages: [],
            hadError: false,
            transport: 'sse',
            allReadUpToId
          });
        });

        source.onerror = () => {
          if (source) {
            source.close();
            source = null;
          }
          startPollingFallback();
        };
      } catch {
        startPollingFallback();
      }

      return () => {
        if (source) {
          source.close();
        }
        fallbackSub?.unsubscribe();
      };
    });
  }
}
