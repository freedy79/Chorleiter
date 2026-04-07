import { Injectable } from '@angular/core';
import { NotificationService } from './notification.service';
import { PushNotificationService } from './push-notification.service';
import { Choir } from '@core/models/choir';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

/**
 * Handles PWA install prompt and push notification prompt logic.
 * Extracted from MainLayoutComponent to keep that component focused on layout.
 */
@Injectable({ providedIn: 'root' })
export class PwaInstallService {
  private deferredInstallPrompt: BeforeInstallPromptEvent | null = null;
  private installNotificationShown = false;
  private pushPromptShown = false;

  private readonly installPromptCooldownKey = 'pwa-install-prompt-dismissed-at';
  private readonly installPromptCooldownMs = 7 * 24 * 60 * 60 * 1000;
  private readonly pushPromptCooldownKey = 'push-prompt-dismissed-at';
  private readonly pushPromptCooldownMs = 7 * 24 * 60 * 60 * 1000;

  constructor(
    private notification: NotificationService,
    private pushService: PushNotificationService
  ) {}

  setDeferredInstallPrompt(event: Event): void {
    (event as BeforeInstallPromptEvent).preventDefault();
    this.deferredInstallPrompt = event as BeforeInstallPromptEvent;
  }

  onAppInstalled(): void {
    this.deferredInstallPrompt = null;
    this.installNotificationShown = true;
    localStorage.removeItem(this.installPromptCooldownKey);
  }

  tryShowInstallNotification(isMobile: boolean): void {
    if (this.installNotificationShown || !this.deferredInstallPrompt) return;
    if (this.isAppInstalled() || !isMobile || this.isInstallPromptInCooldown()) return;

    this.installNotificationShown = true;

    const snackBarRef = this.notification.infoWithAction(
      'Diese App kann auf deinem Gerät installiert werden.',
      'Installieren',
      12000
    );

    snackBarRef.onAction().subscribe(() => { void this.promptInstall(); });
    snackBarRef.afterDismissed().subscribe(result => {
      if (!result.dismissedByAction) this.markInstallPromptDismissed();
    });
  }

  tryShowPushPrompt(choirs: Choir[]): void {
    if (this.pushPromptShown || !this.pushService.isSupported()) return;

    const permission = this.pushService.getPermission();
    if (permission !== 'default') {
      if (permission === 'granted') {
        const storedIds = this.pushService.getStoredChoirIds();
        const missingIds = choirs.map(c => c.id).filter(id => !storedIds.includes(id));
        if (missingIds.length > 0) {
          this.pushService.subscribeToAllChoirs(missingIds).catch(() => {});
        }
      }
      return;
    }

    if (this.isPushPromptInCooldown()) return;

    this.pushPromptShown = true;

    const snackBarRef = this.notification.infoWithAction(
      'Möchtest du Push-Benachrichtigungen für Chat, Beiträge und Dienste aktivieren?',
      'Aktivieren',
      15000
    );

    snackBarRef.onAction().subscribe(() => {
      const choirIds = choirs.map(c => c.id);
      this.pushService.subscribeToAllChoirs(choirIds).catch(() => {});
    });

    snackBarRef.afterDismissed().subscribe(result => {
      if (!result.dismissedByAction) this.markPushPromptDismissed();
    });
  }

  private async promptInstall(): Promise<void> {
    if (!this.deferredInstallPrompt) return;
    const installPrompt = this.deferredInstallPrompt;
    this.deferredInstallPrompt = null;
    try {
      await installPrompt.prompt();
      const result = await installPrompt.userChoice;
      if (result.outcome !== 'accepted') {
        this.markInstallPromptDismissed();
      } else {
        localStorage.removeItem(this.installPromptCooldownKey);
      }
    } catch {
      this.markInstallPromptDismissed();
    }
  }

  private isAppInstalled(): boolean {
    const standaloneNavigator = (window.navigator as Navigator & { standalone?: boolean }).standalone;
    return window.matchMedia('(display-mode: standalone)').matches || !!standaloneNavigator;
  }

  private isInstallPromptInCooldown(): boolean {
    const ts = Number(localStorage.getItem(this.installPromptCooldownKey));
    return !isNaN(ts) && ts > 0 && Date.now() - ts < this.installPromptCooldownMs;
  }

  private markInstallPromptDismissed(): void {
    localStorage.setItem(this.installPromptCooldownKey, Date.now().toString());
  }

  private isPushPromptInCooldown(): boolean {
    const ts = Number(localStorage.getItem(this.pushPromptCooldownKey));
    return !isNaN(ts) && ts > 0 && Date.now() - ts < this.pushPromptCooldownMs;
  }

  private markPushPromptDismissed(): void {
    localStorage.setItem(this.pushPromptCooldownKey, Date.now().toString());
  }
}
