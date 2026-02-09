export interface PhysicalCopy {
  id: number;
  libraryItemId: number;
  quantity: number;
  purchaseDate?: string | null;
  vendor?: string | null;
  unitPrice?: number | null;
  notes?: string | null;
  condition?: 'new' | 'good' | 'worn' | 'damaged' | null;
}
