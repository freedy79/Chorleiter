export interface StartChoirRegistrationRequestPayload {
  requesterName: string;
  requesterEmail: string;
  requesterPhone?: string;
  choirName: string;
  city: string;
  congregation?: string;
  district?: string;
}

export interface StartChoirRegistrationResponse {
  message: string;
  requestId: number;
}

export interface VerifyChoirRegistrationPayload {
  code: string;
}

export interface ReferralRecommendationPayload {
  recipientName: string;
  recipientEmail: string;
  invitationType?: 'singer' | 'choir-admin';
  dismissPrompt?: boolean;
}
