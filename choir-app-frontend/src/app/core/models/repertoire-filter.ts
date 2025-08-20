export interface RepertoireFilter {
  id: number;
  name: string;
  visibility: 'personal' | 'local' | 'global';
  data: {
    /**
     * New multi collection filter. When present this replaces the legacy
     * single `collectionId` field. Empty array means no filter.
     */
    collectionIds?: number[];
    /** Legacy single collection filter retained for backwards compatibility */
    collectionId?: number | null;
    categoryIds?: number[];
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
    licenses?: string[];
  };
}
