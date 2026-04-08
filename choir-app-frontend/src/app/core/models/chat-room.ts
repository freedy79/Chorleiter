export interface ChatRoom {
  id: number;
  choirId: number;
  key: string;
  title: string;
  isPrivate?: boolean;
  isDefault: boolean;
  canManage?: boolean;
  unreadCount: number;
  lastReadAt: string | null;
  lastReadMessageId: number | null;
  lastMessageAt: string | null;
  oldestUnreadPreview?: string | null;
  oldestUnreadAt?: string | null;
}

export interface ChatRoomDetail {
  id: number;
  choirId: number;
  key: string;
  title: string;
  isPrivate: boolean;
  isDefault: boolean;
  memberUserIds: number[];
}

export interface ChatUnreadMessageHint {
  messageId: number;
  createdAt: string;
  preview: string;
  authorName: string | null;
}

export interface ChatUnreadSummary {
  totalUnread: number;
  oldestUnread?: {
    chatRoomId: number;
    key: string;
    title: string;
    messageId: number;
    createdAt: string;
    preview: string;
    authorName: string | null;
  } | null;
  newestUnread?: {
    chatRoomId: number;
    key: string;
    title: string;
    messageId: number;
    createdAt: string;
    preview: string;
    authorName: string | null;
  } | null;
  rooms: Array<{
    chatRoomId: number;
    key: string;
    title: string;
    unreadCount: number;
    oldestUnreadMessageId?: number | null;
    newestUnread?: ChatUnreadMessageHint | null;
  }>;
}

export interface ChatGlobalUnreadOverview {
  totalUnread: number;
  choirs: Array<{
    choirId: number;
    choirName: string | null;
    totalUnread: number;
    rooms: Array<{
      chatRoomId: number;
      key: string;
      title: string;
      unreadCount: number;
    }>;
  }>;
  oldestUnread: {
    choirId: number;
    choirName: string | null;
    chatRoomId: number;
    roomTitle: string;
    messageId: number;
    createdAt: string;
    preview: string;
    authorName: string | null;
  } | null;
  newestUnread: {
    choirId: number;
    choirName: string | null;
    chatRoomId: number;
    roomTitle: string;
    messageId: number;
    createdAt: string;
    preview: string;
    authorName: string | null;
  } | null;
}
