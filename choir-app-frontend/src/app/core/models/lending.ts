export interface Lending {
  id: number;
  copyNumber: number;
  borrowerName?: string | null;
  borrowerId?: number | null;
  status: 'available' | 'borrowed';
  borrowedAt?: string;
  returnedAt?: string;
}
