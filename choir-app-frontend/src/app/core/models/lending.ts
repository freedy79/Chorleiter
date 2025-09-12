export interface Lending {
  id: number;
  copyNumber: number;
  borrowerName?: string;
  borrowerId?: number;
  status: 'available' | 'borrowed';
}
