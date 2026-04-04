export interface ChatAttachment {
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
}

export interface ChatMessage {
  id: number;
  chatRoomId: number;
  userId: number;
  text: string | null;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  deleted: boolean;
  replyToMessageId: number | null;
  attachment: ChatAttachment | null;
  author: {
    id: number;
    firstName: string | null;
    name: string;
  } | null;
  isOwnMessage: boolean;
}

export interface ChatMessageListResponse {
  room: {
    id: number;
    key: string;
    title: string;
    isDefault: boolean;
  };
  messages: ChatMessage[];
  allReadUpToId: number | null;
  realtime?: {
    transport: 'polling' | 'sse' | 'websocket';
    supportsCursor: boolean;
    cursorType: 'afterId' | 'afterTimestamp';
    recommendedRetryMs: number;
  };
  cursor?: {
    lastMessageId: number | null;
    serverTime: string;
  };
}
