export interface MailLog {
  id: number;
  recipients: string;
  subject?: string | null;
  body?: string | null;
  createdAt: string;
}
