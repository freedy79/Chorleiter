import { Routes } from '@angular/router';

// Importieren der Komponenten und des Guards
import { LoginComponent } from './features/login/login.component';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { DashboardComponent } from './features/home/dashboard/dashboard.component';
import { LiteratureListComponent } from './features/literature/literature-list/literature-list.component';
import { CollectionListComponent } from './features/collections/collection-list/collection-list.component';
import { CollectionEditComponent } from './features/collections/collection-edit/collection-edit.component';
import { ProfileComponent } from './features/user/profile/profile.component';
import { AuthGuard } from './core/guards/auth-guard'; // Stellen Sie sicher, dass der Pfad korrekt ist
import { ImprintComponent } from '@features/legal/imprint/imprint.component';
import { PrivacyComponent } from '@features/legal/privacy/privacy.component';
import { AdminGuard } from '@core/guards/admin-guard';
import { LoginGuard } from '@core/guards/login.guard';
import { HomeComponent } from '@features/home/home.component';
import { ManageChoirComponent } from '@features/choir-management/manage-choir/manage-choir.component';
import { ManageChoirResolver } from '@features/choir-management/manage-choir-resolver';
import { EventListComponent } from '@features/events/event-list/event-list.component';
import { MonthlyPlanComponent } from '@features/monthly-plan/monthly-plan.component';
import { InviteRegistrationComponent } from '@features/user/registration/invite-registration.component';
import { StatisticsComponent } from '@features/home/stats/statistics.component';
import { PasswordResetRequestComponent } from '@features/user/password-reset/password-reset-request.component';
import { PasswordResetComponent } from '@features/user/password-reset/password-reset.component';
import { PieceDetailComponent } from '@features/literature/piece-detail/piece-detail.component';
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
            { path: 'imprint', component: ImprintComponent },
            { path: 'privacy', component: PrivacyComponent },
            { path: 'donate', component: DonateComponent },
            { path: 'donation-success', component: DonationSuccessComponent },
            { path: 'donation-cancel', component: DonationCancelComponent },

            // --- Geschützte Routen (jede einzelne hat jetzt den Guard) ---
            {
                path: 'dashboard',
                component: DashboardComponent,
                canActivate: [AuthGuard],
            },
            {
                path: 'repertoire',
                component: LiteratureListComponent,
                canActivate: [AuthGuard],
            },
            {
                path: 'collections',
                component: CollectionListComponent,
                canActivate: [AuthGuard],
            },
            {
                path: 'collections/new',
                component: CollectionEditComponent,
                canActivate: [AuthGuard],
            },
            {
                path: 'collections/edit/:id',
                component: CollectionEditComponent,
                canActivate: [AuthGuard],
            },
            {
                path: 'events',
                component: EventListComponent,
                canActivate: [AuthGuard]
            },
            {
                path: 'dienstplan',
                component: MonthlyPlanComponent,
                canActivate: [AuthGuard]
            },
            {
                path: 'stats',
                component: StatisticsComponent,
                canActivate: [AuthGuard]
            },
            {
                path: 'pieces/:id',
                component: PieceDetailComponent,
                canActivate: [AuthGuard]
            },
            {
                path: 'profile',
                component: ProfileComponent,
                canActivate: [AuthGuard],
            },
            {
                path: 'manage-choir',
                component: ManageChoirComponent,
                canActivate: [AuthGuard],
                resolve: {pageData: ManageChoirResolver }
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
