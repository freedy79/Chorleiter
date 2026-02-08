import { Routes } from '@angular/router';
import { MainLayoutComponent } from '../../layout/main-layout/main-layout.component';
import { PendingChangesGuard } from '@core/guards/pending-changes.guard';

export const adminRoutes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      // Main Dashboard
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
        data: { title: 'Admin Dashboard' }
      },

      // Consolidated Hubs
      {
        path: 'mail-management',
        loadComponent: () => import('./mail-management/mail-management.component').then(m => m.MailManagementComponent),
        data: { title: 'Admin – E-Mail Management' }
      },
      {
        path: 'organizations',
        loadComponent: () => import('./organizations/organizations.component').then(m => m.OrganizationsComponent),
        data: { title: 'Admin – Organisationen' }
      },
      {
        path: 'metadata',
        loadComponent: () => import('./metadata/metadata.component').then(m => m.MetadataComponent),
        data: { title: 'Admin – Metadaten' }
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

      // Legacy routes (kept for backward compatibility)
      { path: 'general', loadComponent: () => import('./general/general-settings.component').then(m => m.GeneralSettingsComponent), canDeactivate: [PendingChangesGuard], data: { title: 'Admin – Allgemein' } },
      { path: 'creators', loadComponent: () => import('./manage-creators/manage-creators.component').then(m => m.ManageCreatorsComponent), data: { title: 'Admin – Komponisten' } },
      { path: 'publishers', loadComponent: () => import('./manage-publishers/manage-publishers.component').then(m => m.ManagePublishersComponent), data: { title: 'Admin – Verlage' } },
      { path: 'choirs', loadComponent: () => import('./manage-choirs/manage-choirs.component').then(m => m.ManageChoirsComponent), data: { title: 'Admin – Chöre' } },
      { path: 'users', loadComponent: () => import('./manage-users/manage-users.component').then(m => m.ManageUsersComponent), data: { title: 'Admin – Benutzer' } },
      { path: 'districts', loadComponent: () => import('./manage-districts/manage-districts.component').then(m => m.ManageDistrictsComponent), data: { title: 'Admin – Bezirke' } },
      { path: 'congregations', loadComponent: () => import('./manage-congregations/manage-congregations.component').then(m => m.ManageCongregationsComponent), data: { title: 'Admin – Gemeinden' } },
      { path: 'piece-changes', loadComponent: () => import('./manage-piece-changes/manage-piece-changes.component').then(m => m.ManagePieceChangesComponent), data: { title: 'Admin – Änderungen' } },
      { path: 'protocols', loadComponent: () => import('./protocols/protocols.component').then(m => m.ProtocolsComponent), data: { title: 'Admin – Protokolle' } },
      { path: 'donations', loadComponent: () => import('./donations/donations.component').then(m => m.DonationsComponent), data: { title: 'Admin – Spenden' } },
      { path: 'develop', loadComponent: () => import('./develop/develop.component').then(m => m.DevelopComponent), data: { title: 'Admin – Develop' } },
      { path: 'files', loadComponent: () => import('./manage-files/manage-files.component').then(m => m.ManageFilesComponent), data: { title: 'Admin – Dateien' } },
    ],
  },
];
