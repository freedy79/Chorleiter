export interface ChoirDigitalLicense {
  id: number;
  choirId: number;
  collectionId: number;
  licenseNumber: string;
  licenseType: 'print' | 'display' | 'stream' | 'archive';
  quantity?: number | null;
  purchaseDate?: string | null;
  vendor?: string | null;
  unitPrice?: number | null;
  validFrom?: string | null;
  validUntil?: string | null;
  notes?: string | null;
  documentPath?: string | null;
  documentOriginalName?: string | null;
  documentMime?: string | null;
  documentSize?: number | null;
}
