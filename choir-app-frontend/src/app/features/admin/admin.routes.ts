import { Routes } from '@angular/router';
import { MainLayoutComponent } from '../../layout/main-layout/main-layout.component';

export const adminRoutes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      { path: '', redirectTo: 'composers', pathMatch: 'full' },
      { path: 'composers', loadComponent: () => import('./manage-composers/manage-composers.component').then(m => m.ManageComposersComponent) },
      { path: 'authors', loadComponent: () => import('./manage-authors/manage-authors.component').then(m => m.ManageAuthorsComponent) },
      { path: 'choirs', loadComponent: () => import('./manage-choirs/manage-choirs.component').then(m => m.ManageChoirsComponent) },
      { path: 'users', loadComponent: () => import('./manage-users/manage-users.component').then(m => m.ManageUsersComponent) },
      { path: 'backup', loadComponent: () => import('./backup/backup.component').then(m => m.BackupComponent) },
      { path: 'protocols', loadComponent: () => import('./protocols/protocols.component').then(m => m.ProtocolsComponent) },
      { path: 'mail-settings', loadComponent: () => import('./mail-settings/mail-settings.component').then(m => m.MailSettingsComponent) },
    ],
  },
];
