export interface MailDeliveryDiagnostics {
  available: boolean;
  platform?: string;
  message?: string;
  checkedAt?: string;
  counts?: {
    sent: number;
    deferred: number;
    bounced: number;
    rejected: number;
  };
  queue?: {
    empty: boolean;
    raw: string;
  };
  tOnline?: {
    ok: boolean;
    lines: string[];
    stderr?: string;
  };
  statuses?: {
    ok: boolean;
    lines: string[];
    stderr?: string;
  };
  hints?: string[];
}
