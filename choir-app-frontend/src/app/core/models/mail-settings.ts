export interface MailSettings {
  host: string;
  port: number;
  user?: string;
  pass?: string;
  secure: boolean;
  starttls: boolean;
  fromAddress?: string;
}
