export interface LoanRequestItemPayload {
  libraryItemId: number;
  quantity: number;
}

export interface LoanRequestPayload {
  startDate?: Date | string;
  endDate?: Date | string;
  reason?: string;
  items: LoanRequestItemPayload[];
}
