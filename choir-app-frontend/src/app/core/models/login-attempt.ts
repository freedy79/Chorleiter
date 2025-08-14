export interface LoginAttempt {
  id: number;
  email: string;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  reason?: string;
  createdAt: string;
  updatedAt: string;
}
