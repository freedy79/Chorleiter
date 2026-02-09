import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi, withXsrfConfiguration } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { provideServiceWorker } from '@angular/service-worker';
import { MAT_SNACK_BAR_DEFAULT_OPTIONS, MatSnackBarModule } from '@angular/material/snack-bar';

import { AppComponent } from './app/app.component';
import { AppRoutingModule } from './app/app-routing.module';
import { AuthInterceptor } from '@core/interceptors/auth-interceptor';
import { TimeoutInterceptor } from '@core/interceptors/timeout-interceptor';
import { LoadingInterceptor } from '@core/interceptors/loading-interceptor';
import { ErrorInterceptor } from '@core/interceptors/error-interceptor';
import { XsrfInterceptor } from '@core/interceptors/xsrf-interceptor';
import { registerLocaleData } from '@angular/common';
import localeDe from '@angular/common/locales/de'; // Importieren Sie das deutsche Sprachpaket
import localeDeExtra from '@angular/common/locales/extra/de'; // Optionale extra Daten
import { LOCALE_ID, ErrorHandler } from '@angular/core';
import { MAT_DATE_LOCALE, DateAdapter } from '@angular/material/core';
import { MondayFirstDateAdapter } from '@core/adapters/monday-first-date-adapter';
import { GlobalErrorHandler } from '@core/handlers/global-error.handler';
import { CustomDateAdapter } from '@shared/util/custom.date.adapter';
import { CdkColumnDef } from '@angular/cdk/table';
import { environment } from './environments/environment';

registerLocaleData(localeDe, 'de-DE', localeDeExtra);

// This is the modern way to provide routes
bootstrapApplication(AppComponent, {
  providers: [
    importProvidersFrom(MatSnackBarModule),
    provideRouter(AppRoutingModule.routes, withPreloading(PreloadAllModules)), // Preload all lazy modules after initial load
    provideAnimations(), // Provides BrowserAnimationsModule
    provideServiceWorker('ngsw-worker.js', { enabled: environment.production, registrationStrategy: 'registerImmediately' }),
    provideHttpClient(
      withInterceptorsFromDi(),
      withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' })
    ),
    { provide: HTTP_INTERCEPTORS, useClass: XsrfInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: TimeoutInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: LoadingInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    { provide: LOCALE_ID, useValue: 'de-DE' },
    { provide: MAT_DATE_LOCALE, useValue: 'de-DE' },
    { provide: DateAdapter, useClass: CustomDateAdapter },
    { provide: MAT_SNACK_BAR_DEFAULT_OPTIONS, useValue: { verticalPosition: 'top' } },
    CdkColumnDef
  ]
}).catch(err => console.error(err));
