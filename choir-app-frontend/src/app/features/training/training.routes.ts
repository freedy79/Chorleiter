import { Routes } from '@angular/router';
import { MainLayoutComponent } from '../../layout/main-layout/main-layout.component';

export const trainingRoutes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/training-dashboard.component').then(m => m.TrainingDashboardComponent),
        data: { title: 'ChorTraining' }
      },
      {
        path: 'exercises',
        loadComponent: () => import('./exercises/exercise-list/exercise-list.component').then(m => m.ExerciseListComponent),
        data: { title: 'Übungen' }
      },
      {
        path: 'exercises/:id',
        loadComponent: () => import('./exercises/exercise-player/exercise-player.component').then(m => m.ExercisePlayerComponent),
        data: { title: 'Übung' }
      },
      {
        path: 'badges',
        loadComponent: () => import('./badges/badge-gallery.component').then(m => m.BadgeGalleryComponent),
        data: { title: 'Abzeichen' }
      },
      {
        path: 'stats',
        loadComponent: () => import('./stats/training-stats.component').then(m => m.TrainingStatsComponent),
        data: { title: 'Trainingsstatistik' }
      },
    ],
  },
];
