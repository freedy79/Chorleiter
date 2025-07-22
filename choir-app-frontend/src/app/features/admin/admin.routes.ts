import { Routes } from '@angular/router';
import { MainLayoutComponent } from '../../layout/main-layout/main-layout.component';
import { PendingChangesGuard } from '@core/guards/pending-changes.guard';

export const adminRoutes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      { path: '', redirectTo: 'general', pathMatch: 'full' },
      {
        path: 'general',
        loadComponent: () => import('./general/general-settings.component').then(m => m.GeneralSettingsComponent),
        canDeactivate: [PendingChangesGuard],
        data: { title: 'Admin – Allgemein' }
      },
      { path: 'creators', loadComponent: () => import('./manage-creators/manage-creators.component').then(m => m.ManageCreatorsComponent), data: { title: 'Admin – Komponisten' } },
      { path: 'publishers', loadComponent: () => import('./manage-publishers/manage-publishers.component').then(m => m.ManagePublishersComponent), data: { title: 'Admin – Verlage' } },
      { path: 'choirs', loadComponent: () => import('./manage-choirs/manage-choirs.component').then(m => m.ManageChoirsComponent), data: { title: 'Admin – Chöre' } },
      { path: 'users', loadComponent: () => import('./manage-users/manage-users.component').then(m => m.ManageUsersComponent), data: { title: 'Admin – Benutzer' } },
      { path: 'piece-changes', loadComponent: () => import('./manage-piece-changes/manage-piece-changes.component').then(m => m.ManagePieceChangesComponent), data: { title: 'Admin – Änderungen' } },
      { path: 'protocols', loadComponent: () => import('./protocols/protocols.component').then(m => m.ProtocolsComponent), data: { title: 'Admin – Protokolle' } },
      { path: 'develop', loadComponent: () => import('./develop/develop.component').then(m => m.DevelopComponent), data: { title: 'Admin – Develop' } },
    ],
  },
];
