export interface Choir {
    id: number;
    name: string;
    description?: string;
    location?: string;
    memberCount?: number;
    eventCount?: number;
    pieceCount?: number;
    modules?: {
        dienstplan?: boolean;
        joinByLink?: boolean;
        /**
         * Visibility configuration for main navigation items for singers.
         * true means the item is visible, false hides it.
         */
        singerMenu?: Record<string, boolean>;
    };
    joinHash?: string;
}
