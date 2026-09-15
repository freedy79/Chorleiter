/**
 * Zentrale Navigationsdefinition für den Administrationsbereich.
 *
 * Single Source of Truth: Sowohl die persistente Admin-Sidebar (AdminShell)
 * als auch das Admin-Dashboard (Launchpad) konsumieren ausschließlich diese
 * Konfiguration. Dadurch können beide Ansichten nicht mehr auseinanderlaufen.
 */

export type AdminCategory =
  | 'organization'
  | 'content'
  | 'communication'
  | 'security'
  | 'system';

export interface AdminNavItem {
  id: string;
  label: string;
  icon: string;
  /** Absolute Route auf den kanonischen Hub. */
  route: string;
  category: AdminCategory;
  description: string;
}

export interface AdminNavGroup {
  category: AdminCategory;
  label: string;
  items: AdminNavItem[];
}

export const ADMIN_CATEGORY_LABELS: Record<AdminCategory, string> = {
  organization: 'Organisation',
  content: 'Inhalte',
  communication: 'Kommunikation',
  security: 'Sicherheit',
  system: 'System',
};

export const ADMIN_CATEGORY_ORDER: AdminCategory[] = [
  'organization',
  'content',
  'communication',
  'security',
  'system',
];

/**
 * Kanonische Hub-Liste. Jeder Eintrag entspricht genau einer erreichbaren
 * Admin-Funktion. Ehemalige Einzelseiten (Chöre, Verlage, Protokolle, …) sind
 * als Tabs in den jeweiligen Hubs aufgegangen und werden per Redirect bedient.
 */
export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  // ----- Organisation -----
  {
    id: 'organizations',
    label: 'Organisationen',
    icon: 'account_balance',
    route: '/admin/organizations',
    category: 'organization',
    description: 'Bezirke, Gemeinden, Chöre und Registrierungsanfragen',
  },
  {
    id: 'users',
    label: 'Benutzer',
    icon: 'people',
    route: '/admin/users',
    category: 'organization',
    description: 'Benutzer und Rollen verwalten',
  },

  // ----- Inhalte -----
  {
    id: 'metadata',
    label: 'Metadaten',
    icon: 'library_music',
    route: '/admin/metadata',
    category: 'content',
    description: 'Verlage, Komponisten/Autoren und Dateien',
  },
  {
    id: 'data-enrichment',
    label: 'Datenanreicherung',
    icon: 'auto_awesome',
    route: '/admin/data-enrichment',
    category: 'content',
    description: 'Metadaten automatisch prüfen & ergänzen',
  },
  {
    id: 'piece-changes',
    label: 'Änderungsvorschläge',
    icon: 'rate_review',
    route: '/admin/piece-changes',
    category: 'content',
    description: 'Vorgeschlagene Änderungen prüfen',
  },

  // ----- Kommunikation -----
  {
    id: 'mail-management',
    label: 'E-Mail Management',
    icon: 'mail',
    route: '/admin/mail-management',
    category: 'communication',
    description: 'Templates, Einstellungen und Logs',
  },
  {
    id: 'pdf-templates',
    label: 'PDF-Templates',
    icon: 'picture_as_pdf',
    route: '/admin/pdf-templates',
    category: 'communication',
    description: 'Layout & Export-Templates verwalten',
  },

  // ----- Sicherheit -----
  {
    id: 'security',
    label: 'Sicherheit & Monitoring',
    icon: 'security',
    route: '/admin/security',
    category: 'security',
    description: 'Login-Versuche, Protokolle und Logs',
  },

  // ----- System -----
  {
    id: 'backup',
    label: 'Backup',
    icon: 'backup',
    route: '/admin/backup',
    category: 'system',
    description: 'Datenbank sichern und wiederherstellen',
  },
  {
    id: 'system-settings',
    label: 'Systemeinstellungen',
    icon: 'settings',
    route: '/admin/system-settings',
    category: 'system',
    description: 'URLs, PayPal, Imprint, Datenschutz, Entwicklung',
  },
  {
    id: 'pwa-config',
    label: 'PWA Konfiguration',
    icon: 'install_mobile',
    route: '/admin/pwa-config',
    category: 'system',
    description: 'VAPID Keys, Service Worker, Cache',
  },
  {
    id: 'usage-statistics',
    label: 'Nutzungsstatistiken',
    icon: 'bar_chart',
    route: '/admin/usage-statistics',
    category: 'system',
    description: 'Seitenaufrufe, geteilte Stücke, Trends',
  },
  {
    id: 'donations',
    label: 'Spenden',
    icon: 'volunteer_activism',
    route: '/admin/donations',
    category: 'system',
    description: 'Eingegangene Spenden einsehen',
  },
];

/** Gruppiert die Hub-Liste nach Kategorie in definierter Reihenfolge. */
export function groupAdminNavByCategory(
  items: AdminNavItem[] = ADMIN_NAV_ITEMS
): AdminNavGroup[] {
  return ADMIN_CATEGORY_ORDER.map(category => ({
    category,
    label: ADMIN_CATEGORY_LABELS[category],
    items: items.filter(item => item.category === category),
  })).filter(group => group.items.length > 0);
}
