export interface RepertoireFilter {
  id: number;
  name: string;
  visibility: 'personal' | 'local' | 'global';
  data: {
    collectionId?: number | null;
    categoryIds?: number[];
    onlySingable?: boolean;
    /**
     * Legacy single-status field. Kept for backwards compatibility when
     * loading older presets or local storage state.
     */
    status?: 'CAN_BE_SUNG' | 'IN_REHEARSAL' | 'NOT_READY' | null;
    /**
     * New multi status selection. When set, this takes precedence over the
     * legacy `status` property.
     */
    statuses?: ('CAN_BE_SUNG' | 'IN_REHEARSAL' | 'NOT_READY')[];
    search?: string;
  };
}
