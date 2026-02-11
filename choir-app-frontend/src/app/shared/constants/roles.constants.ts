/**
 * Global and choir-specific role constants.
 * Centralizes role definitions used throughout the application.
 */

/**
 * Global application roles.
 * These are system-wide roles that apply across all choirs.
 */
export const GLOBAL_ROLES = {
  ADMIN: 'admin',
  LIBRARIAN: 'librarian',
  DEMO: 'demo',
  USER: 'user'
} as const;

/**
 * Choir-specific roles.
 * These are roles that users can have within a specific choir.
 */
export const CHOIR_ROLES = {
  DIRECTOR: 'director',
  CHOIR_ADMIN: 'choir_admin',
  ORGANIST: 'organist',
  SINGER: 'singer'
} as const;

/**
 * Display names for global roles (German).
 */
export const GLOBAL_ROLE_LABELS: Record<string, string> = {
  [GLOBAL_ROLES.ADMIN]: 'Administrator',
  [GLOBAL_ROLES.LIBRARIAN]: 'Bibliothekar',
  [GLOBAL_ROLES.DEMO]: 'Demo-Benutzer',
  [GLOBAL_ROLES.USER]: 'Benutzer'
};

/**
 * Display names for choir-specific roles (German).
 */
export const CHOIR_ROLE_LABELS: Record<string, string> = {
  [CHOIR_ROLES.DIRECTOR]: 'Dirigent',
  [CHOIR_ROLES.CHOIR_ADMIN]: 'Chor-Admin',
  [CHOIR_ROLES.ORGANIST]: 'Organist',
  [CHOIR_ROLES.SINGER]: 'Sänger'
};

/**
 * Type representing valid global role names
 */
export type GlobalRole = typeof GLOBAL_ROLES[keyof typeof GLOBAL_ROLES];

/**
 * Type representing valid choir-specific role names
 */
export type ChoirRole = typeof CHOIR_ROLES[keyof typeof CHOIR_ROLES];

/**
 * Checks if a user has admin privileges.
 *
 * @param globalRoles - Array of global roles
 * @returns true if user is admin
 */
export function isAdmin(globalRoles: string[]): boolean {
  return globalRoles.includes(GLOBAL_ROLES.ADMIN);
}

/**
 * Checks if a user has librarian privileges.
 *
 * @param globalRoles - Array of global roles
 * @returns true if user is librarian
 */
export function isLibrarian(globalRoles: string[]): boolean {
  return globalRoles.includes(GLOBAL_ROLES.LIBRARIAN);
}

/**
 * Checks if a user is a demo account.
 *
 * @param globalRoles - Array of global roles
 * @returns true if user is demo
 */
export function isDemo(globalRoles: string[]): boolean {
  return globalRoles.includes(GLOBAL_ROLES.DEMO);
}

/**
 * Checks if a user is a choir director.
 *
 * @param choirRoles - Array of choir-specific roles
 * @returns true if user is director
 */
export function isDirector(choirRoles: string[]): boolean {
  return choirRoles.includes(CHOIR_ROLES.DIRECTOR);
}

/**
 * Checks if a user is a choir admin.
 *
 * @param choirRoles - Array of choir-specific roles
 * @returns true if user is choir admin
 */
export function isChoirAdmin(choirRoles: string[]): boolean {
  return choirRoles.includes(CHOIR_ROLES.CHOIR_ADMIN);
}

/**
 * Gets the display name for a global role.
 *
 * @param role - The global role
 * @returns The localized display name
 */
export function getGlobalRoleLabel(role: string): string {
  return GLOBAL_ROLE_LABELS[role] || role;
}

/**
 * Gets the display name for a choir role.
 *
 * @param role - The choir role
 * @returns The localized display name
 */
export function getChoirRoleLabel(role: string): string {
  return CHOIR_ROLE_LABELS[role] || role;
}
