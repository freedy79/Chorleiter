export interface UserAvailability {
  date: string;
  status: 'AVAILABLE' | 'MAYBE' | 'UNAVAILABLE';
  /** Automatically generated note for church holidays */
  holidayHint?: string;
}
