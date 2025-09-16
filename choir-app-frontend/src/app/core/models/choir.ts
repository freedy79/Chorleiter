export type ChoirRole = 'director' | 'choir_admin' | 'organist' | 'singer';

export interface ChoirMembership {
    rolesInChoir: ChoirRole[];
    registrationStatus: 'REGISTERED' | 'PENDING';
}

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
        programs?: boolean;
        joinByLink?: boolean;
        /**
         * Visibility configuration for main navigation items for singers.
         * true means the item is visible, false hides it.
         */
        singerMenu?: Record<string, boolean>;
    };
    joinHash?: string;
    membership?: ChoirMembership;
}
