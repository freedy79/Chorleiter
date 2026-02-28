import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { Subject } from 'rxjs';
import { catchError, switchMap, takeUntil } from 'rxjs/operators';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';

import { ChatService } from '@core/services/chat.service';
import { ChatRealtimeService } from '@core/services/chat-realtime.service';
import { NotificationService } from '@core/services/notification.service';
import { AuthService } from '@core/services/auth.service';
import { ChatRoom } from '@core/models/chat-room';
import { ChatMessage } from '@core/models/chat-message';
import { ApiService } from '@core/services/api.service';
import { UserInChoir } from '@core/models/user';
import { ChatRoomDialogComponent, ChatRoomDialogResult } from './chat-room-dialog.component';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit, OnDestroy {
  rooms: ChatRoom[] = [];
  selectedRoomId: number | null = null;
  messages: ChatMessage[] = [];

  loadingRooms = false;
  loadingMessages = false;
  sending = false;

  draftText = '';
  replyTo: ChatMessage | null = null;
  selectedAttachment: File | null = null;

  currentUserId: number | null = null;
  pollError = false;
  currentTransport: 'sse' | 'polling' | 'websocket' | null = null;
  isChoirAdmin = false;
  choirMembers: UserInChoir[] = [];
  roomMutationInProgress = false;

  highlightedMessageId: number | null = null;
  private targetRoomId: number | null = null;
  private targetMessageId: number | null = null;

  private readonly destroy$ = new Subject<void>();
  private readonly roomRealtimeStop$ = new Subject<void>();

  constructor(
    private chatService: ChatService,
    private chatRealtime: ChatRealtimeService,
    private notification: NotificationService,
    private auth: AuthService,
    private api: ApiService,
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.auth.currentUser$.pipe(takeUntil(this.destroy$)).subscribe(user => {
      this.currentUserId = user?.id ?? null;
    });

    this.auth.isChoirAdmin$.pipe(takeUntil(this.destroy$)).subscribe(isAdmin => {
      this.isChoirAdmin = isAdmin;
      if (isAdmin) {
        this.loadChoirMembers();
      }
    });

    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const roomParam = Number(params.get('room'));
      const messageParam = Number(params.get('message'));

      this.targetRoomId = Number.isInteger(roomParam) && roomParam > 0 ? roomParam : null;
      this.targetMessageId = Number.isInteger(messageParam) && messageParam > 0 ? messageParam : null;

      if (this.rooms.length > 0) {
        if (this.targetRoomId && this.targetRoomId !== this.selectedRoomId && this.rooms.some(room => room.id === this.targetRoomId)) {
          this.selectRoom(this.targetRoomId);
        } else if (this.targetRoomId && !this.rooms.some(room => room.id === this.targetRoomId)) {
          this.clearInvalidRoomQueryParams();
          this.targetRoomId = null;
        } else if (this.targetMessageId && this.selectedRoomId) {
          this.loadMessages();
        }
      }
    });

    this.loadRooms(this.targetRoomId || undefined);
  }

  ngOnDestroy(): void {
    this.roomRealtimeStop$.next();
    this.destroy$.next();
    this.destroy$.complete();
    this.roomRealtimeStop$.complete();
  }

  loadRooms(selectRoomId?: number): void {
    this.loadingRooms = true;
    this.chatService.getRooms().pipe(takeUntil(this.destroy$)).subscribe({
      next: rooms => {
        this.rooms = rooms;
        this.loadingRooms = false;

        const requestedRoomId = selectRoomId ?? this.targetRoomId ?? this.selectedRoomId ?? null;
        const preferredId = requestedRoomId && rooms.some(room => room.id === requestedRoomId)
          ? requestedRoomId
          : (rooms[0]?.id ?? null);

        if (requestedRoomId && preferredId !== requestedRoomId) {
          this.clearInvalidRoomQueryParams();
        }

        if (preferredId) {
          this.selectRoom(preferredId);
        }
      },
      error: () => {
        this.loadingRooms = false;
        this.notification.error('Chat-Räume konnten nicht geladen werden.');
      }
    });
  }

  selectRoom(roomId: number): void {
    if (this.selectedRoomId === roomId && this.messages.length > 0) return;

    this.roomRealtimeStop$.next();
    this.selectedRoomId = roomId;
    this.messages = [];
    this.replyTo = null;
    this.pollError = false;
    this.currentTransport = null;
    this.loadMessages();
  }

  loadMessages(): void {
    if (!this.selectedRoomId) return;

    this.loadingMessages = true;
    const roomId = this.selectedRoomId;
    const targetMessageId = this.targetMessageId;

    const load$ = targetMessageId
      ? this.chatService.getMessageById(targetMessageId).pipe(
          switchMap(message => {
            if (message.room?.id !== roomId) {
              return this.chatService.getMessages(roomId, { limit: 100 });
            }

            const before = new Date(new Date(message.createdAt).getTime() + 1).toISOString();
            return this.chatService.getMessages(roomId, { before, limit: 100 });
          }),
          catchError(() => this.chatService.getMessages(roomId, { limit: 100 }))
        )
      : this.chatService.getMessages(roomId, { limit: 100 });

    load$.pipe(takeUntil(this.destroy$)).subscribe({
      next: response => {
        this.messages = response.messages;
        this.loadingMessages = false;
        this.focusTargetMessageIfPresent();
        this.markReadToLatest();
        this.startRealtimeForSelectedRoom();
      },
      error: () => {
        this.loadingMessages = false;
        this.notification.error('Nachrichten konnten nicht geladen werden.');
      }
    });
  }

  sendMessage(): void {
    if (!this.selectedRoomId || this.sending) return;

    const trimmed = this.draftText.trim();
    if (!trimmed && !this.selectedAttachment) return;

    this.sending = true;

    const optimisticId = -Date.now();
    const optimisticMessage: ChatMessage = {
      id: optimisticId,
      chatRoomId: this.selectedRoomId,
      userId: this.currentUserId ?? 0,
      text: trimmed || null,
      createdAt: new Date().toISOString(),
      editedAt: null,
      deletedAt: null,
      deleted: false,
      replyToMessageId: this.replyTo?.id ?? null,
      attachment: this.selectedAttachment
        ? {
            originalName: this.selectedAttachment.name,
            mimeType: this.selectedAttachment.type,
            size: this.selectedAttachment.size,
            url: ''
          }
        : null,
      author: { id: this.currentUserId ?? 0, name: 'Ich' },
      isOwnMessage: true
    };

    this.messages = [...this.messages, optimisticMessage];

    this.chatService.sendMessage(this.selectedRoomId, {
      text: trimmed,
      replyToMessageId: this.replyTo?.id ?? null,
      attachment: this.selectedAttachment
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: saved => {
        this.messages = this.messages.map(msg => msg.id === optimisticId ? saved : msg);
        this.afterSendReset();
        this.markReadToLatest();
        this.loadRooms(this.selectedRoomId || undefined);
      },
      error: err => {
        this.messages = this.messages.filter(msg => msg.id !== optimisticId);
        this.sending = false;
        this.notification.error(err?.error?.message || 'Nachricht konnte nicht gesendet werden.');
      }
    });
  }

  deleteMessage(message: ChatMessage): void {
    if (!message?.id || message.id < 0) return;

    this.chatService.deleteMessage(message.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.messages = this.messages.map(item => item.id === message.id
          ? { ...item, deleted: true, text: null, attachment: null, deletedAt: new Date().toISOString() }
          : item
        );
      },
      error: err => {
        this.notification.error(err?.error?.message || 'Nachricht konnte nicht gelöscht werden.');
      }
    });
  }

  beginReply(message: ChatMessage): void {
    if (message.deleted) return;
    this.replyTo = message;
  }

  cancelReply(): void {
    this.replyTo = null;
  }

  onAttachmentSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    this.selectedAttachment = file;
  }

  clearAttachment(fileInput: HTMLInputElement): void {
    this.selectedAttachment = null;
    fileInput.value = '';
  }

  resolveReplyPreview(message: ChatMessage): string {
    const parent = this.messages.find(msg => msg.id === message.replyToMessageId);
    if (!parent) return 'Antwort auf Nachricht';
    if (parent.deleted) return 'Antwort auf gelöschte Nachricht';
    if (parent.text) return parent.text;
    if (parent.attachment) return `📎 ${parent.attachment.originalName}`;
    return 'Antwort auf Nachricht';
  }

  trackMessage(index: number, item: ChatMessage): number {
    return item.id;
  }

  isOwnMessage(message: ChatMessage): boolean {
    return message.userId === this.currentUserId;
  }

  get selectedRoomTitle(): string {
    if (!this.selectedRoomId) return '#allgemein';
    return this.rooms.find(room => room.id === this.selectedRoomId)?.title || '#allgemein';
  }

  get selectedRoom(): ChatRoom | null {
    if (!this.selectedRoomId) return null;
    return this.rooms.find(room => room.id === this.selectedRoomId) || null;
  }

  get canManageSelectedRoom(): boolean {
    return !!this.selectedRoom && this.isChoirAdmin;
  }

  openCreateRoomDialog(): void {
    if (!this.isChoirAdmin || this.roomMutationInProgress) return;

    const dialogRef = this.dialog.open(ChatRoomDialogComponent, {
      width: '560px',
      maxWidth: '96vw',
      data: {
        mode: 'create',
        choirMembers: this.choirMembers
      }
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((result?: ChatRoomDialogResult) => {
      if (!result) return;
      this.createRoom(result);
    });
  }

  openEditSelectedRoomDialog(): void {
    if (!this.selectedRoomId || !this.isChoirAdmin || this.roomMutationInProgress) return;

    this.chatService.getRoomDetail(this.selectedRoomId).pipe(takeUntil(this.destroy$)).subscribe({
      next: roomDetail => {
        const dialogRef = this.dialog.open(ChatRoomDialogComponent, {
          width: '560px',
          maxWidth: '96vw',
          data: {
            mode: 'edit',
            choirMembers: this.choirMembers,
            room: {
              id: roomDetail.id,
              title: roomDetail.title,
              isPrivate: roomDetail.isPrivate,
              isDefault: roomDetail.isDefault,
              memberUserIds: roomDetail.memberUserIds || []
            }
          }
        });

        dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((result?: ChatRoomDialogResult) => {
          if (!result) return;
          this.updateRoom(roomDetail.id, result);
        });
      },
      error: err => {
        this.notification.error(err?.error?.message || 'Raumdaten konnten nicht geladen werden.');
      }
    });
  }

  private createRoom(payload: ChatRoomDialogResult): void {
    this.roomMutationInProgress = true;
    this.chatService.createRoom({
      title: payload.title,
      isPrivate: payload.isPrivate,
      memberUserIds: payload.memberUserIds
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: room => {
        this.notification.success('Raum wurde erstellt.');
        this.roomMutationInProgress = false;
        this.loadRooms(room.id);
      },
      error: err => {
        this.roomMutationInProgress = false;
        this.notification.error(err?.error?.message || 'Raum konnte nicht erstellt werden.');
      }
    });
  }

  private updateRoom(roomId: number, payload: ChatRoomDialogResult): void {
    this.roomMutationInProgress = true;
    this.chatService.updateRoom(roomId, {
      title: payload.title,
      isPrivate: payload.isPrivate,
      memberUserIds: payload.memberUserIds
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.notification.success('Raum wurde aktualisiert.');
        this.roomMutationInProgress = false;
        this.loadRooms(roomId);
      },
      error: err => {
        this.roomMutationInProgress = false;
        this.notification.error(err?.error?.message || 'Raum konnte nicht aktualisiert werden.');
      }
    });
  }

  get transportLabel(): string {
    if (this.currentTransport === 'sse') return 'Live (SSE)';
    if (this.currentTransport === 'polling') return 'Fallback (Polling)';
    if (this.currentTransport === 'websocket') return 'Live (WebSocket)';
    return 'Verbinde…';
  }

  private afterSendReset(): void {
    this.draftText = '';
    this.replyTo = null;
    this.selectedAttachment = null;
    this.sending = false;
  }

  private startRealtimeForSelectedRoom(): void {
    if (!this.selectedRoomId) return;

    const roomId = this.selectedRoomId;
    this.chatRealtime.watchRoom(
      roomId,
      () => this.messages[this.messages.length - 1]?.id
    )
      .pipe(takeUntil(this.roomRealtimeStop$), takeUntil(this.destroy$))
      .subscribe(update => {
        this.currentTransport = update.transport;

        if (update.hadError) {
          this.pollError = true;
          return;
        }

        this.pollError = false;
        if (!update.messages?.length) return;

        const knownIds = new Set(this.messages.map(message => message.id));
        const additions = update.messages.filter(message => !knownIds.has(message.id));
        if (!additions.length) return;

        this.messages = [...this.messages, ...additions];
        this.focusTargetMessageIfPresent();
        this.markReadToLatest();
        this.loadRooms(roomId);
      });
  }

  private loadChoirMembers(): void {
    this.api.getChoirMembers().pipe(takeUntil(this.destroy$)).subscribe({
      next: members => {
        this.choirMembers = members || [];
      },
      error: () => {
        this.choirMembers = [];
      }
    });
  }

  private focusTargetMessageIfPresent(): void {
    if (!this.targetMessageId) return;
    const targetId = this.targetMessageId;
    const targetExists = this.messages.some(message => message.id === targetId);
    if (!targetExists) return;

    this.targetMessageId = null;
    this.highlightedMessageId = targetId;

    setTimeout(() => {
      const element = document.getElementById(`chat-message-${targetId}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);

    setTimeout(() => {
      if (this.highlightedMessageId === targetId) {
        this.highlightedMessageId = null;
      }
    }, 2800);
  }

  private markReadToLatest(): void {
    if (!this.selectedRoomId || this.messages.length === 0) return;

    const lastMessage = this.messages[this.messages.length - 1];
    this.chatService.markRoomRead(this.selectedRoomId, lastMessage.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.rooms = this.rooms.map(room => room.id === this.selectedRoomId
            ? {
                ...room,
                unreadCount: 0,
                lastReadMessageId: lastMessage.id,
                lastReadAt: new Date().toISOString()
              }
            : room
          );
        }
      });
  }

  private clearInvalidRoomQueryParams(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        room: null,
        message: null
      },
      queryParamsHandling: 'merge',
      replaceUrl: true
    }).catch(() => {
      // no-op
    });
  }
}
