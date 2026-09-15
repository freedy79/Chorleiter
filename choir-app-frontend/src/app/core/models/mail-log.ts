export interface MailLogTriggerUser {
  id: number;
  firstName?: string | null;
  name?: string | null;
  email?: string | null;
}

export interface MailLogTriggerChoir {
  id: number;
  name?: string | null;
}

export interface MailLog {
  id: number;
  recipients: string;
  subject?: string | null;
  body?: string | null;
  status?: 'SENT' | 'FAILED' | 'BLOCKED' | string;
  errorMessage?: string | null;
  triggerUserId?: number | null;
  triggerChoirId?: number | null;
  triggerSource?: string | null;
  triggerAction?: string | null;
  triggerUser?: MailLogTriggerUser | null;
  triggerChoir?: MailLogTriggerChoir | null;
  createdAt: string;
}
