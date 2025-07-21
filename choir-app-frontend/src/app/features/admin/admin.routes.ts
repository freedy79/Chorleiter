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
        canDeactivate: [PendingChangesGuard]
      },
      { path: 'creators', loadComponent: () => import('./manage-creators/manage-creators.component').then(m => m.ManageCreatorsComponent) },
      { path: 'publishers', loadComponent: () => import('./manage-publishers/manage-publishers.component').then(m => m.ManagePublishersComponent) },
      { path: 'choirs', loadComponent: () => import('./manage-choirs/manage-choirs.component').then(m => m.ManageChoirsComponent) },
      { path: 'users', loadComponent: () => import('./manage-users/manage-users.component').then(m => m.ManageUsersComponent) },
      { path: 'piece-changes', loadComponent: () => import('./manage-piece-changes/manage-piece-changes.component').then(m => m.ManagePieceChangesComponent) },
      { path: 'protocols', loadComponent: () => import('./protocols/protocols.component').then(m => m.ProtocolsComponent) },
      { path: 'develop', loadComponent: () => import('./develop/develop.component').then(m => m.DevelopComponent) },
    ],
  },
];
