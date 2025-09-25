export interface DashboardContact {
  id: number;
  firstName?: string | null;
  name: string;
  email: string;
  phone?: string | null;
  rolesInChoir?: string[];
}
