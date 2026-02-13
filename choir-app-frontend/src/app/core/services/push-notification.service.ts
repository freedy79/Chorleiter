import { Injectable } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '@core/services/api.service';

interface PushSubscriptionState {
  endpoint: string;
  choirIds: number[];
}

@Injectable({
  providedIn: 'root'
})
export class PushNotificationService {
  private readonly storageKey = 'push-subscriptions-v1';

  constructor(
    private swPush: SwPush,
    private api: ApiService,
    private router: Router
  ) {}

  isSupported(): boolean {
    return this.swPush.isEnabled;
  }

  getPermission(): NotificationPermission {
    if (typeof Notification === 'undefined') {
      return 'denied';
    }
    return Notification.permission;
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (typeof Notification === 'undefined') {
      return 'denied';
    }
    return Notification.requestPermission();
  }

  async subscribeToChoir(choirId: number): Promise<void> {
    if (!this.swPush.isEnabled) {
      throw new Error('Push-Benachrichtigungen werden in diesem Browser nicht unterstützt.');
    }

    const permission = await this.ensurePermission();
    if (permission !== 'granted') {
      throw new Error('Push-Benachrichtigungen wurden nicht erlaubt.');
    }

    const publicKey = await firstValueFrom(this.api.getVAPIDPublicKey());
    const subscription = await this.swPush.requestSubscription({
      serverPublicKey: publicKey
    });

    await firstValueFrom(this.api.subscribePushNotification(subscription, choirId));
    this.storeSubscription(subscription, choirId);
  }

  async unsubscribeFromChoir(choirId: number): Promise<void> {
    const subscription = await firstValueFrom(this.swPush.subscription);
    if (!subscription?.endpoint) {
      this.removeStoredChoir(choirId);
      return;
    }

    await firstValueFrom(this.api.unsubscribePushNotification(subscription.endpoint, choirId));
    this.removeStoredChoir(choirId);
  }

  getStoredChoirIds(): number[] {
    const state = this.getStoredState();
    return state?.choirIds ?? [];
  }

  hasStoredChoir(choirId: number): boolean {
    return this.getStoredChoirIds().includes(choirId);
  }

  async clearAllSubscriptions(): Promise<void> {
    const subscription = await firstValueFrom(this.swPush.subscription);
    const endpoint = subscription?.endpoint;
    const choirIds = this.getStoredChoirIds();

    if (endpoint && choirIds.length > 0) {
      await Promise.all(
        choirIds.map(id => firstValueFrom(this.api.unsubscribePushNotification(endpoint, id)))
      );
    }

    this.clearStoredState();
  }

  initializeNotificationClicks(): void {
    if (!this.swPush.isEnabled) {
      return;
    }

    this.swPush.notificationClicks.subscribe(event => {
      const url = event?.notification?.data?.url as string | undefined;
      if (url) {
        this.router.navigateByUrl(url).catch(() => {
          window.location.href = url;
        });
      }
    });
  }

  private async ensurePermission(): Promise<NotificationPermission> {
    const current = this.getPermission();
    if (current === 'default') {
      return this.requestPermission();
    }
    return current;
  }

  private storeSubscription(subscription: PushSubscription, choirId: number): void {
    const json = subscription.toJSON();
    const endpoint = json?.endpoint || subscription.endpoint;
    if (!endpoint) return;

    const existing = this.getStoredState();
    const choirIds = new Set<number>(existing?.endpoint === endpoint ? existing.choirIds : []);
    choirIds.add(choirId);

    const nextState: PushSubscriptionState = {
      endpoint,
      choirIds: Array.from(choirIds)
    };
    localStorage.setItem(this.storageKey, JSON.stringify(nextState));
  }

  private removeStoredChoir(choirId: number): void {
    const existing = this.getStoredState();
    if (!existing) return;

    const nextChoirs = existing.choirIds.filter(id => id !== choirId);
    if (nextChoirs.length === 0) {
      this.clearStoredState();
      return;
    }

    const nextState: PushSubscriptionState = {
      endpoint: existing.endpoint,
      choirIds: nextChoirs
    };
    localStorage.setItem(this.storageKey, JSON.stringify(nextState));
  }

  private clearStoredState(): void {
    localStorage.removeItem(this.storageKey);
  }

  private getStoredState(): PushSubscriptionState | null {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as PushSubscriptionState;
      if (!parsed?.endpoint || !Array.isArray(parsed.choirIds)) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }
}
