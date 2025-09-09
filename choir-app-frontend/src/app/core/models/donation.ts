export interface Donation {
  id: number;
  userId: number;
  amount: number;
  donatedAt: string;
  user?: {
    id: number;
    firstName?: string;
    name: string;
    email: string;
  };
}
