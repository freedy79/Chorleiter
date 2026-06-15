import { Routes } from '@angular/router';
import { MainLayoutComponent } from '../../layout/main-layout/main-layout.component';
import { AdminShellComponent } from './admin-shell/admin-shell.component';
import { redirectToHub } from './admin-redirect.guard';

export const adminRoutes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      {
        // Persistente Admin-Hülle mit eigener Kontext-Navigation
        path: '',
        component: AdminShellComponent,
        children: [
          // Einstieg / Launchpad
          { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
          {
            path: 'dashboard',
            loadComponent: () => import('./admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
            data: { title: 'Admin Dashboard' }
          },

          // ----- Kanonische Hubs -----
          {
            path: 'organizations',
            loadComponent: () => import('./organizations/organizations.component').then(m => m.OrganizationsComponent),
            data: { title: 'Admin – Organisationen' }
          },
          {
            path: 'users',
            loadComponent: () => import('./manage-users/manage-users.component').then(m => m.ManageUsersComponent),
            data: { title: 'Admin – Benutzer' }
          },
          {
            path: 'metadata',
            loadComponent: () => import('./metadata/metadata.component').then(m => m.MetadataComponent),
            data: { title: 'Admin – Metadaten' }
          },
          {
            path: 'data-enrichment',
            loadComponent: () => import('./data-enrichment/data-enrichment.component').then(m => m.DataEnrichmentComponent),
            data: { title: 'Admin – Datenanreicherung' }
          },
          {
            path: 'piece-changes',
            loadComponent: () => import('./manage-piece-changes/manage-piece-changes.component').then(m => m.ManagePieceChangesComponent),
            data: { title: 'Admin – Änderungsvorschläge' }
          },
          {
            path: 'mail-management',
            loadComponent: () => import('./mail-management/mail-management.component').then(m => m.MailManagementComponent),
            data: { title: 'Admin – E-Mail Management' }
          },
          {
            path: 'pdf-templates',
            loadComponent: () => import('./pdf-templates/pdf-templates.component').then(m => m.PdfTemplatesComponent),
            data: { title: 'Admin – PDF Templates' }
          },
          {
            path: 'security',
            loadComponent: () => import('./security/security.component').then(m => m.SecurityComponent),
            data: { title: 'Admin – Sicherheit' }
          },
          {
            path: 'system-settings',
            loadComponent: () => import('./system-settings/system-settings.component').then(m => m.SystemSettingsComponent),
            data: { title: 'Admin – Systemeinstellungen' }
          },
          {
            path: 'pwa-config',
            loadComponent: () => import('./pwa-config/pwa-config.component').then(m => m.PwaConfigComponent),
            data: { title: 'Admin – PWA Konfiguration' }
          },
          {
            path: 'usage-statistics',
            loadComponent: () => import('./usage-statistics/usage-statistics.component').then(m => m.UsageStatisticsComponent),
            data: { title: 'Admin – Nutzungsstatistiken' }
          },
          {
            path: 'donations',
            loadComponent: () => import('./donations/donations.component').then(m => m.DonationsComponent),
            data: { title: 'Admin – Spenden' }
          },

          // ----- Legacy-Routen → Redirect auf den passenden Hub-Tab -----
          // (erhält alte Links/Bookmarks, verhindert Doppelungen im Menü)
          { path: 'general', canActivate: [redirectToHub('system-settings', 'urls')], children: [] },
          { path: 'choirs', canActivate: [redirectToHub('organizations', 'choirs')], children: [] },
          { path: 'districts', canActivate: [redirectToHub('organizations', 'districts')], children: [] },
          { path: 'congregations', canActivate: [redirectToHub('organizations', 'congregations')], children: [] },
          { path: 'creators', canActivate: [redirectToHub('metadata', 'creators')], children: [] },
          { path: 'publishers', canActivate: [redirectToHub('metadata', 'publishers')], children: [] },
          { path: 'files', canActivate: [redirectToHub('metadata', 'files')], children: [] },
          { path: 'protocols', canActivate: [redirectToHub('security', 'protocols')], children: [] },
          { path: 'develop', canActivate: [redirectToHub('system-settings', 'develop')], children: [] },
        ],
      },
    ],
  },
];
