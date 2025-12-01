export interface Loan {
  id: number;
  collectionTitle: string;
  collectionComposer?: string;
  choirName: string;
  startDate?: string;
  endDate?: string;
  status: 'available' | 'requested' | 'borrowed' | 'due' | 'partial_return';
}
