export interface ChoirLog {
  id: number;
  action: string;
  details?: any;
  createdAt: string;
  user?: {
    id: number;
    firstName: string;
    name: string;
  };
}
