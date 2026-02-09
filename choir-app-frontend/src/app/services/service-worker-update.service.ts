import { Injectable, NgZone } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { BehaviorSubject, Observable, interval } from 'rxjs';
import { filter, switchMap, debounceTime } from 'rxjs/operators';

/**
 * Service für die Verwaltung von Service Worker Updates
 * Überprüft automatisch auf neue Versionen und benachrichtigt den Benutzer
 */
@Injectable({
  providedIn: 'root'
})
export class ServiceWorkerUpdateService {
  /**
   * Observable, das true emittiert wenn ein Update verfügbar ist
   */
  private updateAvailable$ = new BehaviorSubject<boolean>(false);

  /**
   * Observable, das true emittiert wenn die App gerade aktualisiert wird
   */
  private updating$ = new BehaviorSubject<boolean>(false);

  /**
   * Observable für den Update-Status
   */
  public updateAvailable = this.updateAvailable$.asObservable();
  public updating = this.updating$.asObservable();

  constructor(
    private swUpdate: SwUpdate,
    private ngZone: NgZone
  ) {
    this.initializeUpdateChecking();
  }

  /**
   * Initialisiert die automatische Überprüfung auf Updates
   */
  private initializeUpdateChecking(): void {
    // Überprüfe auf Updates im Service Worker
    if (this.swUpdate.isEnabled) {
      // Initiiere Update-Check alle 30 Minuten
      this.ngZone.runOutsideAngular(() => {
        interval(30 * 60 * 1000)
          .pipe(
            switchMap(() => this.swUpdate.checkForUpdate())
          )
          .subscribe({
            error: (err) => console.error('Fehler beim Update-Check:', err)
          });
      });

      // Reagiere auf verfügbare Updates
      this.ngZone.run(() => {
        this.swUpdate.versionUpdates
          .pipe(
            filter(evt => evt.type === 'VERSION_READY'),
            debounceTime(100)
          )
          .subscribe(() => {
            this.updateAvailable$.next(true);
            console.log('Neue App-Version verfügbar!');
          });
      });

      // Reagiere auf aktivierte Updates
      this.swUpdate.versionUpdates
        .pipe(
          filter(evt => evt.type === 'VERSION_INSTALLATION_FAILED')
        )
        .subscribe((evt) => {
          console.warn('Installation der neuen Version fehlgeschlagen:', evt);
          this.updating$.next(false);
        });

      // Initial check nach App-Start
      this.ngZone.runOutsideAngular(() => {
        setTimeout(() => {
          this.swUpdate.checkForUpdate().catch(err => {
            console.error('Fehler beim initialen Update-Check:', err);
          });
        }, 5000);
      });
    }
  }

  /**
   * Triggert die Installation und Aktivierung des neuen Service Workers
   * @returns Promise die sich resolved wenn das Update abgeschlossen ist
   */
  public async activateUpdate(): Promise<void> {
    if (!this.swUpdate.isEnabled) {
      console.warn('Service Worker ist nicht aktiviert');
      return;
    }

    try {
      this.updating$.next(true);

      // Aktiviere den neuen Service Worker
      await this.swUpdate.activateUpdate();

      // Reload der Seite nach dem Update
      document.location.reload();
    } catch (err) {
      console.error('Fehler beim Aktivieren des Updates:', err);
      this.updating$.next(false);
      throw err;
    }
  }

  /**
   * Überprüft manuell auf neue Updates
   * @returns Promise die sich resolved wenn der Check abgeschlossen ist
   */
  public async checkForUpdates(): Promise<boolean> {
    if (!this.swUpdate.isEnabled) {
      console.warn('Service Worker ist nicht aktiviert');
      return false;
    }

    try {
      const updated = await this.swUpdate.checkForUpdate();
      return updated;
    } catch (err) {
      console.error('Fehler beim Update-Check:', err);
      return false;
    }
  }

  /**
   * Gibt an ob ein Update verfügbar ist
   */
  public isUpdateAvailable(): boolean {
    return this.updateAvailable$.value;
  }

  /**
   * Gibt an ob die App gerade aktualisiert wird
   */
  public isUpdating(): boolean {
    return this.updating$.value;
  }

  /**
   * Deaktiviert den Service Worker (für Development/Debugging)
   * Hinweis: Das ist gefährlich und sollte nur zu Testzwecken verwendet werden
   */
  public unregisterServiceWorker(): Promise<boolean> {
    return navigator.serviceWorker.getRegistration()
      .then(registration => {
        if (registration) {
          return registration.unregister();
        }
        return false;
      })
      .catch(err => {
        console.error('Fehler beim Entfernen des Service Workers:', err);
        return false;
      });
  }

  /**
   * Gibt Informationen über den registrierten Service Worker
   */
  public async getServiceWorkerInfo(): Promise<ServiceWorker | null> {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      return registration?.active || null;
    } catch (err) {
      console.error('Fehler beim Abrufen des Service Workers:', err);
      return null;
    }
  }
}
