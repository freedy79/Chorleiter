export interface Composer {
  id: number;
  name: string;
  birthYear?: number | null;
  deathYear?: number | null;
  canDelete?: boolean;
}
