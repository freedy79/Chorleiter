export interface RepertoireFilter {
  id: number;
  name: string;
  visibility: 'personal' | 'local' | 'global';
  data: {
    collectionId?: number | null;
    categoryIds?: number[];
    onlySingable?: boolean;
    status?: 'CAN_BE_SUNG' | 'IN_REHEARSAL' | 'NOT_READY' | null;
    search?: string;
  };
}
