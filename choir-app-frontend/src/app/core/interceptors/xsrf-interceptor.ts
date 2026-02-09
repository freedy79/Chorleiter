import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

@Injectable()
export class XsrfInterceptor implements HttpInterceptor {
  private readonly headerName = 'X-XSRF-TOKEN';
  private readonly cookieName = 'XSRF-TOKEN';

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Only apply to API URLs
    if (!request.url.startsWith(environment.apiUrl)) {
      return next.handle(request);
    }

    // Only apply to state-changing methods
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method.toUpperCase())) {
      return next.handle(request);
    }

    // Skip if header already present
    if (request.headers.has(this.headerName)) {
      return next.handle(request);
    }

    // Try to get token from cookie using native browser API
    const token = this.extractCookie(this.cookieName);
    if (!token) {
      console.warn('[XsrfInterceptor] No XSRF cookie found:', this.cookieName);
      return next.handle(request);
    }

    // Clone request and add header
    console.log('[XsrfInterceptor] Adding token to', request.method, request.url);
    const updated = request.clone({
      setHeaders: { [this.headerName]: token },
      withCredentials: true
    });

    return next.handle(updated);
  }

  /**
   * Extract a cookie value by name using native browser parsing
   */
  private extractCookie(name: string): string | undefined {
    if (typeof document === 'undefined') {
      return undefined;
    }

    const cookies = document.cookie.split('; ');
    const prefix = name + '=';

    for (const cookie of cookies) {
      if (cookie.startsWith(prefix)) {
        const value = cookie.substring(prefix.length);
        try {
          // Try to decode if it's URL-encoded
          return decodeURIComponent(value);
        } catch {
          // If decoding fails, return as-is
          return value;
        }
      }
    }

    return undefined;
  }
}
