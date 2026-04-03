export interface MailLog {
  id: number;
  recipients: string;
  subject?: string | null;
  body?: string | null;
  status?: 'SENT' | 'FAILED' | 'BLOCKED' | string;
  errorMessage?: string | null;
  createdAt: string;
}
