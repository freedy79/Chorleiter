export interface PersonalAddressBookEntry {
  id: number;
  firstName?: string;
  name?: string;
  email: string;
}

export interface EmailAddressCheckResult {
  knownUserEmails: string[];
  knownPersonalEmails: string[];
  newEmails: string[];
  invalidEmails: string[];
}

export interface MonthlyPlanRecipientPreference {
  selectedUserIds: number[];
  selectedAddressBookEntryIds: number[];
}
