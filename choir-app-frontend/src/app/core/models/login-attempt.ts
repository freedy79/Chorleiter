export interface LoginAttempt {
  id: number;
  email: string;
  success: boolean;
  ipAddress?: string;
  createdAt: string;
  updatedAt: string;
}
