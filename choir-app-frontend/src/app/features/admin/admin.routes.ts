import { Routes } from '@angular/router';
import { MainLayoutComponent } from '../../layout/main-layout/main-layout.component';

export const adminRoutes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      { path: '', redirectTo: 'creators', pathMatch: 'full' },
      { path: 'creators', loadComponent: () => import('./manage-creators/manage-creators.component').then(m => m.ManageCreatorsComponent) },
      { path: 'choirs', loadComponent: () => import('./manage-choirs/manage-choirs.component').then(m => m.ManageChoirsComponent) },
      { path: 'users', loadComponent: () => import('./manage-users/manage-users.component').then(m => m.ManageUsersComponent) },
      { path: 'backup', loadComponent: () => import('./backup/backup.component').then(m => m.BackupComponent) },
      { path: 'protocols', loadComponent: () => import('./protocols/protocols.component').then(m => m.ProtocolsComponent) },
      { path: 'mail-settings', loadComponent: () => import('./mail-settings/mail-settings.component').then(m => m.MailSettingsComponent) },
    ],
  },
];
