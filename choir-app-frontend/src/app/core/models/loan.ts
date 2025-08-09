export interface Loan {
  id: number;
  collectionTitle: string;
  choirName: string;
  startDate?: string;
  endDate?: string;
  status: 'available' | 'requested' | 'borrowed' | 'due' | 'partial_return';
}
