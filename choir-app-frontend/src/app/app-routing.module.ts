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
import { WelcomeComponent } from '@features/home/welcome/welcome.component';
import { ManageChoirResolver } from '@features/choir-management/manage-choir-resolver';
import { PublicPageEditorResolver } from '@features/choir-management/public-page-editor-resolver';
import { InviteRegistrationComponent } from '@features/user/registration/invite-registration.component';
import { PasswordResetRequestComponent } from '@features/user/password-reset/password-reset-request.component';
import { PasswordResetComponent } from '@features/user/password-reset/password-reset.component';
import { EmailConfirmComponent } from '@features/user/email-confirm/email-confirm.component';
import { DonateComponent } from '@features/donations/donate.component';
import { DonationSuccessComponent } from '@features/donations/donation-success.component';
import { DonationCancelComponent } from '@features/donations/donation-cancel.component';

export const routes: Routes = [
    {
        path: 'c/:slug',
        loadComponent: () => import('./features/public-choir-page/public-choir-page.component').then(m => m.PublicChoirPageComponent),
        data: { title: 'Chor-Vorstellung' }
    },
    {
        path: 'shared-piece/:token',
        loadComponent: () => import('./features/literature/shared-piece-view/shared-piece-view.component').then(m => m.SharedPieceViewComponent),
        data: { title: 'Geteiltes Stück' }
    },
    {
        path: 'poll-vote/:token',
        loadComponent: () => import('./features/posts/poll-reminder-vote.component').then(m => m.PollReminderVoteComponent),
        data: { title: 'Abstimmung' }
    },
    {
        path: 'forms/public/:guid',
        loadComponent: () => import('./features/forms/form-fill/form-fill.component').then(m => m.FormFillComponent),
        data: { title: 'Formular', isPublic: true }
    },
    // --- Formulare: eigene Seite mit eigenem Layout ---
    {
        path: 'forms',
        loadComponent: () => import('./features/forms/form-layout/form-layout.component').then(m => m.FormLayoutComponent),
        children: [
            {
                path: '',
                pathMatch: 'full',
                loadComponent: () => import('./features/forms/form-list/form-list.component').then(m => m.FormListComponent),
                canActivate: [AuthGuard],
                data: { title: 'Formulare' }
            },
            {
                path: 'new',
                loadComponent: () => import('./features/forms/form-editor/form-editor.component').then(m => m.FormEditorComponent),
                canActivate: [AuthGuard, ChoirAdminGuard],
                data: { title: 'Neues Formular' }
            },
            {
                path: ':id/edit',
                loadComponent: () => import('./features/forms/form-editor/form-editor.component').then(m => m.FormEditorComponent),
                canActivate: [AuthGuard, ChoirAdminGuard],
                data: { title: 'Formular bearbeiten' }
            },
            {
                path: ':id/fill',
                loadComponent: () => import('./features/forms/form-fill/form-fill.component').then(m => m.FormFillComponent),
                canActivate: [AuthGuard],
                data: { title: 'Formular ausfüllen' }
            },
            {
                path: ':id/results',
                loadComponent: () => import('./features/forms/form-results/form-results.component').then(m => m.FormResultsComponent),
                canActivate: [AuthGuard, ChoirAdminGuard],
                data: { title: 'Formular-Ergebnisse' }
            },
            {
                path: ':id/preview',
                loadComponent: () => import('./features/forms/form-fill/form-fill.component').then(m => m.FormFillComponent),
                canActivate: [AuthGuard, ChoirAdminGuard],
                data: { title: 'Formular-Vorschau', isPreview: true }
            },
        ],
    },
    // Die MainLayoutComponent ist jetzt die Wurzel und hat keine Guards
    {
        path: '',
        component: MainLayoutComponent,
        children: [
            {
                path: '',
                pathMatch: 'full',
                component: WelcomeComponent,
                data: {
                    title: 'Willkommen',
                    description: 'NAK Chorleiter unterstützt Chöre bei Repertoire, Verfügbarkeiten, Kommunikation und Einsatzplanung.'
                }
            },
            {
                path: 'login',
                component: LoginComponent,
                canActivate: [LoginGuard],
                data: {
                    title: 'Login',
                    description: 'Melde dich bei NAK Chorleiter an und verwalte deinen Chor digital und effizient.'
                }
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
                data: { title: 'Termine' }
            },
            {
                path: 'posts',
                loadComponent: () => import('./features/posts/post-list.component').then(m => m.PostListComponent),
                canActivate: [AuthGuard],
                data: { title: 'Beiträge', showChoirName: true }
            },
            {
                path: 'chat',
                loadComponent: () => import('./features/chat/chat.component').then(m => m.ChatComponent),
                canActivate: [AuthGuard],
                data: { title: 'Chat', showChoirName: true }
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
                path: 'programs',
                loadComponent: () => import('./features/programs/program-list.component').then(m => m.ProgramListComponent),
                canActivate: [AuthGuard, ProgramGuard],
                data: { title: 'Programmplanung' }
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
                data: { title: 'Notenbestand' }
            },
            {
                path: 'repertoire',
                loadComponent: () => import('./features/literature/literature-list/literature-list.component').then(m => m.LiteratureListComponent),
                canActivate: [AuthGuard],
                data: { title: 'Chor-Repertoire' }
            },
            {
                path: 'practice-lists',
                loadComponent: () => import('./features/practice-lists/practice-lists.component').then(m => m.PracticeListsComponent),
                canActivate: [AuthGuard],
                data: { title: 'Meine Übungslisten' }
            },
            {
                path: 'practice-lists/:id',
                loadComponent: () => import('./features/practice-lists/practice-list-detail.component').then(m => m.PracticeListDetailComponent),
                canActivate: [AuthGuard],
                data: { title: 'Übungsliste' }
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
                data: { title: 'Anwesenheit' }
            },
            {
                path: 'manage-choir',
                loadComponent: () => import('./features/choir-management/manage-choir/manage-choir.component').then(m => m.ManageChoirComponent),
                canActivate: [AuthGuard],
                resolve: {pageData: ManageChoirResolver },
                data: { title: 'Choreinstellungen' }
            },
            {
                path: 'public-page',
                loadComponent: () => import('./features/choir-management/public-page-editor/public-page-editor.component').then(m => m.PublicPageEditorComponent),
                canActivate: [AuthGuard, ChoirAdminGuard],
                resolve: { publicPage: PublicPageEditorResolver },
                data: { title: 'Vorstellungsseite' }
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
