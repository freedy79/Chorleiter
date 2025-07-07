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
    };
    joinHash?: string;
}
