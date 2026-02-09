export interface DigitalLicense {
  id: number;
  libraryItemId: number;
  licenseNumber: string;
  licenseType: 'print' | 'display' | 'stream' | 'archive';
  quantity?: number | null;
  purchaseDate?: string | null;
  vendor?: string | null;
  unitPrice?: number | null;
  validFrom?: string | null;
  validUntil?: string | null;
  notes?: string | null;
}
