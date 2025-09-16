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

export function normalizeChoirRole(role: string): ChoirRole {
    switch (role) {
        case 'chorleiter':
        case 'choirleiter':
        case 'director':
            return 'director';
        case 'choir_admin':
        case 'organist':
        case 'singer':
            return role as ChoirRole;
        default:
            return role as ChoirRole;
    }
}

export function normalizeChoirRoles(roles?: ReadonlyArray<string> | null): ChoirRole[] {
    const mapped = Array.from(roles ?? []).map(role => normalizeChoirRole(role));
    return Array.from(new Set(mapped));
}

export function normalizeChoirMembership(membership?: ChoirMembership): ChoirMembership | undefined {
    if (!membership) {
        return membership;
    }
    return {
        ...membership,
        rolesInChoir: normalizeChoirRoles(membership.rolesInChoir as unknown as string[])
    };
}

export function normalizeChoir(choir: Choir | null | undefined): Choir | null {
    if (!choir) {
        return null;
    }
    return {
        ...choir,
        membership: normalizeChoirMembership(choir.membership)
    };
}

export function normalizeChoirs(choirs?: (Choir | null | undefined)[]): Choir[] {
    return (choirs ?? [])
        .map(normalizeChoir)
        .filter((c): c is Choir => c != null);
}

export function normalizeMembers<T extends { membership?: ChoirMembership }>(members?: T[]): T[] {
    return (members ?? []).map(member => ({
        ...member,
        membership: normalizeChoirMembership(member.membership)
    })) as T[];
}
