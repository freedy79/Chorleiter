export interface PwaConfig {
  id?: number;
  key: string;
  value: string | null;
  type: 'string' | 'boolean' | 'number' | 'json';
  category: string;
  description?: string | null;
  isEditable: boolean;
  isSecret: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PwaConfigCreateRequest {
  key: string;
  value?: string | null;
  type?: 'string' | 'boolean' | 'number' | 'json';
  category: string;
  description?: string | null;
  isEditable?: boolean;
  isSecret?: boolean;
}

export interface PwaConfigUpdateRequest {
  value?: string | null;
  type?: 'string' | 'boolean' | 'number' | 'json';
  category?: string;
  description?: string | null;
  isEditable?: boolean;
  isSecret?: boolean;
}

export interface PwaConfigInitializeResponse {
  message: string;
  created: number;
  skipped: number;
  total: number;
}
