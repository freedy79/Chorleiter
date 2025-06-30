export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system';
  helpShown?: boolean;
  pageSizes?: { [key: string]: number };
}
