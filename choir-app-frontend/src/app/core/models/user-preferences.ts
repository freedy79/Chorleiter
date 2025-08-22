export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system';
  pageSizes?: { [key: string]: number };
  repertoireColumns?: {
    lastSung?: boolean;
    lastRehearsed?: boolean;
    timesSung?: boolean;
    timesRehearsed?: boolean;
  };
}
