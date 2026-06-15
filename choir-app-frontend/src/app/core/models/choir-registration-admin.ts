export type ChoirRegistrationRequestStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export interface ChoirRegistrationRequest {
  id: number;
  requesterName: string;
  requesterEmail: string;
  requesterPhone?: string | null;
  choirName: string;
  city: string;
  congregation?: string | null;
  district?: string | null;
  status: ChoirRegistrationRequestStatus;
  emailVerifiedAt?: string | null;
  createdAt: string;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  createdChoirId?: number | null;
  createdUserId?: number | null;
}
