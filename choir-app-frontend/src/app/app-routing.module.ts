import { Routes } from '@angular/router';

// Importieren der Komponenten und des Guards
import { LoginComponent } from './features/login/login.component';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { LiteratureListComponent } from './features/literature/literature-list/literature-list.component';
import { CollectionListComponent } from './features/collections/collection-list/collection-list.component';
import { CollectionEditComponent } from './features/collections/collection-edit/collection-edit.component';
import { ProfileComponent } from './features/user/profile/profile.component';
import { AuthGuard } from './core/guards/auth-guard'; // Stellen Sie sicher, dass der Pfad korrekt ist
import { ImprintComponent } from '@features/legal/imprint/imprint.component';
import { PrivacyComponent } from '@features/legal/privacy/privacy.component';
import { AdminGuard } from '@core/guards/admin-guard';
import { ManageComposersComponent } from '@features/admin/manage-composers/manage-composers.component';
import { ManageAuthorsComponent } from '@features/admin/manage-authors/manage-authors.component';
import { LoginGuard } from '@core/guards/login.guard';
import { HomeComponent } from '@features/home/home.component';
import { ManageChoirComponent } from '@features/choir-management/manage-choir/manage-choir.component';
import { ManageChoirResolver } from '@features/choir-management/manage-choir-resolver';
import { EventListComponent } from '@features/events/event-list/event-list.component';
import { InviteRegistrationComponent } from '@features/registration/invite-registration.component';

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
            { path: 'imprint', component: ImprintComponent },
            { path: 'privacy', component: PrivacyComponent },

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
        children: [
            { path: '', redirectTo: 'composers', pathMatch: 'full' },
            { path: 'composers', component: ManageComposersComponent },
            { path: 'authors', component: ManageAuthorsComponent },
            // ... andere Admin-Seiten
        ],
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
