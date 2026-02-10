export interface Author {
  id: number;
  name: string;
  birthYear?: number | null;
  deathYear?: number | null;
  canDelete?: boolean;
}
