export interface MemberAvailability {
  userId: number;
  date: string;
  status: 'AVAILABLE' | 'MAYBE' | 'UNAVAILABLE';
}
