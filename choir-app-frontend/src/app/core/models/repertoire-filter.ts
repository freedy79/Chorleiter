export interface RepertoireFilter {
  id: number;
  name: string;
  visibility: 'personal' | 'local' | 'global';
  data: {
    collectionId?: number | null;
    categoryId?: number | null;
    onlySingable?: boolean;
    search?: string;
  };
}
