import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { HTTP_INTERCEPTORS } from '@angular/common/http';

import { AppComponent } from './app/app.component';
import { AppRoutingModule } from './app/app-routing.module';
import { AuthInterceptor } from '@core/interceptors/auth-interceptor';
import { registerLocaleData } from '@angular/common';
import localeDe from '@angular/common/locales/de'; // Importieren Sie das deutsche Sprachpaket
import localeDeExtra from '@angular/common/locales/extra/de'; // Optionale extra Daten
import { LOCALE_ID } from '@angular/core';

registerLocaleData(localeDe, 'de-DE', localeDeExtra);

// This is the modern way to provide routes
bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(AppRoutingModule.routes), // Provide routes from your routing file
    provideAnimations(), // Provides BrowserAnimationsModule
    provideHttpClient(withInterceptorsFromDi()), // Provides HttpClient and interceptor logic
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }, // Provide your interceptor
    { provide: LOCALE_ID, useValue: 'de-DE' }
  ]
}).catch(err => console.error(err));
