import { Routes } from '@angular/router';

// Importieren der Komponenten und des Guards
import { LoginComponent } from './features/user/login/login.component';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { AuthGuard } from './core/guards/auth-guard'; // Stellen Sie sicher, dass der Pfad korrekt ist
import { ImprintComponent } from '@features/legal/imprint/imprint.component';
import { PrivacyComponent } from '@features/legal/privacy/privacy.component';
import { AdminGuard } from '@core/guards/admin-guard';
import { LoginGuard } from '@core/guards/login.guard';
import { ChoirAdminGuard } from '@core/guards/choir-admin.guard';
import { ProgramGuard } from '@core/guards/program.guard';
import { HomeComponent } from '@features/home/home.component';
import { ManageChoirResolver } from '@features/choir-management/manage-choir-resolver';
import { InviteRegistrationComponent } from '@features/user/registration/invite-registration.component';
import { PasswordResetRequestComponent } from '@features/user/password-reset/password-reset-request.component';
import { PasswordResetComponent } from '@features/user/password-reset/password-reset.component';
import { EmailConfirmComponent } from '@features/user/email-confirm/email-confirm.component';
import { DonateComponent } from '@features/donations/donate.component';
import { DonationSuccessComponent } from '@features/donations/donation-success.component';
import { DonationCancelComponent } from '@features/donations/donation-cancel.component';

export const routes: Routes = [
    // Die MainLayoutComponent ist jetzt die Wurzel und hat keine Guards
    {
        path: '',
        component: MainLayoutComponent,
        children: [
            {
                path: '',
                pathMatch: 'full',
                component: HomeComponent,
            },
            {
                path: 'login',
                component: LoginComponent,
                canActivate: [LoginGuard],
            },
            {
                path: 'register/:token',
                component: InviteRegistrationComponent
            },
            {
                path: 'join/:token',
                loadComponent: () => import('./features/user/join/join-choir.component').then(m => m.JoinChoirComponent)
            },
            {
                path: 'forgot-password',
                component: PasswordResetRequestComponent
            },
            {
                path: 'reset-password/:token',
                component: PasswordResetComponent
            },
            {
                path: 'confirm-email/:token',
                component: EmailConfirmComponent
            },
            { path: 'imprint', component: ImprintComponent },
            { path: 'privacy', component: PrivacyComponent },
            { path: 'donate', component: DonateComponent },
            { path: 'donation-success', component: DonationSuccessComponent },
            { path: 'donation-cancel', component: DonationCancelComponent },

            // Shared Piece Route (öffentlich zugänglich mit Token, OHNE AuthGuard!)
            {
                path: 'shared-piece/:token',
                loadComponent: () => import('./features/literature/shared-piece-view/shared-piece-view.component').then(m => m.SharedPieceViewComponent),
                data: { title: 'Geteiltes Stück' }
            },

            // --- Geschützte Routen (jede einzelne hat jetzt den Guard) ---
            {
                path: 'dashboard',
                loadComponent: () => import('./features/home/dashboard/dashboard.component').then(m => m.DashboardComponent),
                canActivate: [AuthGuard],
                data: { title: 'Home' },
            },
            {
                path: 'collections/pieces',
                loadComponent: () => import('./features/collections/piece-list/collection-piece-list.component').then(m => m.CollectionPieceListComponent),
                canActivate: [AuthGuard],
                data: { title: 'Stücke' },
            },
            {
                path: 'collections',
                loadComponent: () => import('./features/collections/collection-list/collection-list.component').then(m => m.CollectionListComponent),
                canActivate: [AuthGuard],
                data: { title: 'Sammlungen' },
            },
            {
                path: 'collections/new',
                loadComponent: () => import('./features/collections/collection-edit/collection-edit.component').then(m => m.CollectionEditComponent),
                canActivate: [AuthGuard, ChoirAdminGuard],
                data: { title: 'Neue Sammlung' },
            },
            {
                path: 'collections/edit/:id',
                loadComponent: () => import('./features/collections/collection-edit/collection-edit.component').then(m => m.CollectionEditComponent),
                canActivate: [AuthGuard, ChoirAdminGuard],
                data: { title: 'Sammlung bearbeiten' },
            },
            {
                path: 'events',
                loadComponent: () => import('./features/events/event-list/event-list.component').then(m => m.EventListComponent),
                canActivate: [AuthGuard],
                data: { title: 'Ereignisse' }
            },
            {
                path: 'dienstplan',
                loadComponent: () => import('./features/monthly-plan/monthly-plan.component').then(m => m.MonthlyPlanComponent),
                canActivate: [AuthGuard],
                data: { title: 'Dienstplan' }
            },
            {
                path: 'availability',
                loadComponent: () => import('./features/availability/availability.component').then(m => m.AvailabilityComponent),
                canActivate: [AuthGuard],
                data: { title: 'Verfügbarkeiten' }
            },
            {
                path: 'posts',
                loadComponent: () => import('./features/posts/post-list.component').then(m => m.PostListComponent),
                canActivate: [AuthGuard],
                data: { title: 'Beiträge', showChoirName: true }
            },
            {
                path: 'programs',
                loadComponent: () => import('./features/programs/program-list.component').then(m => m.ProgramListComponent),
                canActivate: [AuthGuard, ProgramGuard],
                data: { title: 'Programme' }
            },
            {
                path: 'programs/create',
                loadComponent: () => import('./features/programs/program-create.component').then(m => m.ProgramCreateComponent),
                canActivate: [AuthGuard, ProgramGuard],
                data: { title: 'Programm erstellen' }
            },
            {
                path: 'programs/:id',
                loadComponent: () => import('./features/program/program-editor.component').then(m => m.ProgramEditorComponent),
                canActivate: [AuthGuard, ProgramGuard],
                data: { title: 'Programm bearbeiten' }
            },
            {
                path: 'stats',
                loadComponent: () => import('./features/home/stats/statistics.component').then(m => m.StatisticsComponent),
                canActivate: [AuthGuard],
                data: { title: 'Statistik' }
            },
            {
                path: 'library/request',
                loadComponent: () => import('./features/library/loan-cart.component').then(m => m.LoanCartComponent),
                canActivate: [AuthGuard],
                data: { title: 'Entleihkorb' }
            },
            {
                path: 'library',
                loadComponent: () => import('./features/library/library.component').then(m => m.LibraryComponent),
                canActivate: [AuthGuard],
                data: { title: 'Bibliothek' }
            },
            {
                path: 'repertoire',
                loadComponent: () => import('./features/literature/literature-list/literature-list.component').then(m => m.LiteratureListComponent),
                canActivate: [AuthGuard],
                data: { title: 'Repertoire' }
            },
            {
                path: 'pieces/:id',
                loadComponent: () => import('./features/literature/piece-detail/piece-detail.component').then(m => m.PieceDetailComponent),
                canActivate: [AuthGuard],
                data: { title: 'Stückdetails' }
            },
            {
                path: 'search',
                loadComponent: () => import('./features/search-results/search-results.component').then(m => m.SearchResultsComponent),
                canActivate: [AuthGuard],
                data: { title: 'Suche' }
            },
            {
                path: 'profile',
                loadComponent: () => import('./features/user/profile/profile.component').then(m => m.ProfileComponent),
                canActivate: [AuthGuard],
                data: { title: 'Profil' },
            },
            {
                path: 'members',
                loadComponent: () => import('./features/choir-members/choir-members.component').then(m => m.ChoirMembersComponent),
                canActivate: [AuthGuard],
                data: { title: 'Chormitglieder' }
            },
            {
                path: 'participation',
                loadComponent: () => import('./features/participation/participation.component').then(m => m.ParticipationComponent),
                canActivate: [AuthGuard],
                data: { title: 'Beteiligung' }
            },
            {
                path: 'manage-choir',
                loadComponent: () => import('./features/choir-management/manage-choir/manage-choir.component').then(m => m.ManageChoirComponent),
                canActivate: [AuthGuard],
                resolve: {pageData: ManageChoirResolver },
                data: { title: 'Mein Chor' }
            },
        ],
    },
    {
        path: 'admin',
        canActivate: [AuthGuard, AdminGuard], // Muss eingeloggt UND Admin sein
        loadChildren: () => import('./features/admin/admin.routes').then(m => m.adminRoutes),
    },

    // Fallback für unbekannte Routen
    { path: '**', redirectTo: 'login' },
];

// In einer standalone-Anwendung wird diese `routes`-Konstante in `main.ts`
// über `provideRouter(routes)` bereitgestellt. Die Klasse AppRoutingModule kann
// optional sein, aber das Exportieren der Routen ist der Schlüssel.
export class AppRoutingModule {
    static routes = routes;
}
