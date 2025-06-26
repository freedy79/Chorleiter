import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { HTTP_INTERCEPTORS } from '@angular/common/http';

import { AppComponent } from './app/app.component';
import { AppRoutingModule } from './app/app-routing.module';
import { AuthInterceptor } from '@core/interceptors/auth-interceptor';

// This is the modern way to provide routes
bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(AppRoutingModule.routes), // Provide routes from your routing file
    provideAnimations(), // Provides BrowserAnimationsModule
    provideHttpClient(withInterceptorsFromDi()), // Provides HttpClient and interceptor logic
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true } // Provide your interceptor
  ]
}).catch(err => console.error(err));
