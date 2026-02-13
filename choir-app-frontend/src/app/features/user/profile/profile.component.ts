import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';

import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { NotificationService } from '@core/services/notification.service';
import { DialogHelperService } from '@core/services/dialog-helper.service';
import { LeaveChoirResponse, User, GlobalRole } from '@core/models/user';
import { Choir } from '@core/models/choir';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '@core/services/auth.service';
import { District } from '@core/models/district';
import { Congregation } from '@core/models/congregation';
import { PushNotificationService } from '@core/services/push-notification.service';

/**
 * Validator für sichere Passwörter (Option 1: Neue Anforderungen)
 * Mind. 12 Zeichen mit Großbuchstaben, Kleinbuchstaben, Zahlen und Sonderzeichen
 */
export function strongPasswordValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const password = control.value;
    if (!password) {
      return null; // Lass leere Felder zu (sie werden durch Validators.required geprüft)
    }

    const hasLength = password.length >= 12;
    const hasLowerCase = /[a-z]/.test(password);
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[@$!%*?&]/.test(password);

    const isValid = hasLength && hasLowerCase && hasUpperCase && hasNumber && hasSpecialChar;

    if (!isValid) {
      return {
        weakPassword: {
          hasLength,
          hasLowerCase,
          hasUpperCase,
          hasNumber,
          hasSpecialChar
        }
      };
    }
    return null;
  };
}

export function passwordsMatchValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const newPassword = control.get('newPassword')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    return newPassword && confirmPassword && newPassword !== confirmPassword ? { passwordsMismatch: true } : null;
  };
}

type PushPermission = 'default' | 'denied' | 'granted' | string;

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MaterialModule
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit, OnDestroy {
  profileForm: FormGroup;
  currentUser: User | null = null;
  isLoading = true;
  availableChoirs$: Observable<Choir[]>;
  isDemo$: Observable<boolean>;
  districts: District[] = [];
  congregations: Congregation[] = [];
  choirList: Choir[] = [];
  pushSupported = false;
  pushPermission: PushPermission = 'default';
  pushStates: Record<number, boolean> = {};
  isPushUpdating = false;
  private destroy$ = new Subject<void>();

  // Password validation helper methods for template
  hasUpperCase(value: string): boolean {
    return /[A-Z]/.test(value);
  }

  hasLowerCase(value: string): boolean {
    return /[a-z]/.test(value);
  }

  hasNumber(value: string): boolean {
    return /\d/.test(value);
  }

  hasSpecialChar(value: string): boolean {
    return /[@$!%*?&]/.test(value);
  }
  private isDemoUser = false;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private notification: NotificationService,
    private authService: AuthService,
    private dialogHelper: DialogHelperService,
    private pushService: PushNotificationService
  ) {
    this.availableChoirs$ = this.authService.availableChoirs$;
    this.isDemo$ = this.authService.isDemo$;
    this.profileForm = this.fb.group({
      firstName: ['', Validators.required],
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      street: [''],
      postalCode: [''],
      city: [''],
      congregation: [''],
      district: [''],
      voice: [''],
      shareWithChoir: [false],
      roles: [{ value: [], disabled: true }],
      passwords: this.fb.group({
        oldPassword: [''],
        newPassword: ['', [strongPasswordValidator()]],
        confirmPassword: ['']
      }, { validators: passwordsMatchValidator() })
    });
  }

  ngOnInit(): void {
    this.isDemo$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isDemo => {
        this.isDemoUser = isDemo;
        this.updateFormAccess();
      });

    this.availableChoirs$
      .pipe(takeUntil(this.destroy$))
      .subscribe(choirs => {
        this.choirList = Array.isArray(choirs) ? choirs : [];
        this.refreshPushStates();
      });
    this.apiService.getDistricts().pipe(takeUntil(this.destroy$)).subscribe(ds => this.districts = ds);
    this.apiService.getCongregations().pipe(takeUntil(this.destroy$)).subscribe(cs => this.congregations = cs);
    this.apiService.getCurrentUser().pipe(takeUntil(this.destroy$)).subscribe({
      next: (user) => {
        this.currentUser = user;
        // Populate the form with the user's current data
        this.profileForm.patchValue({
          firstName: user.firstName || '',
          name: user.name,
          email: user.email,
          phone: user.phone || '',
          street: user.street || '',
          postalCode: user.postalCode || '',
          city: user.city || '',
          congregation: user.congregation || '',
          district: user.district || '',
          voice: user.voice || '',
          shareWithChoir: !!user.shareWithChoir,
          roles: user.roles || []
        });
        this.updateFormAccess();
        if (!user.congregation || !user.district) {
          this.notification.info('Bitte ergänze dein Profil um Gemeinde und Bezirk.', 10000);
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load user profile', err);
        this.isLoading = false;
      }
    });

    this.pushSupported = this.pushService.isSupported();
    this.pushPermission = this.pushService.getPermission() as PushPermission;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit(): void {
    if (this.isDemoUser) {
      return;
    }
    if (this.profileForm.invalid) {
      return;
    }

    const formValue = this.profileForm.value;
    const oldEmail = this.currentUser?.email;
    const trimmedPhone = typeof formValue.phone === 'string' ? formValue.phone.trim() : undefined;
    const updatePayload: { firstName?: string; name?: string; email?: string; phone?: string; street?: string; postalCode?: string; city?: string; congregation?: string; district?: string; voice?: string; shareWithChoir?: boolean; oldPassword?: string; newPassword?: string; roles?: GlobalRole[] } = {
      firstName: formValue.firstName,
      name: formValue.name,
      email: formValue.email,
      phone: trimmedPhone || undefined,
      street: formValue.street,
      postalCode: formValue.postalCode,
      city: formValue.city,
      congregation: formValue.congregation,
      district: formValue.district,
      voice: formValue.voice,
      shareWithChoir: formValue.shareWithChoir
    };

    if (this.profileForm.get('roles')?.enabled) {
      const roles = (formValue.roles as GlobalRole[] | undefined) ?? [];
      const normalized = Array.from(new Set<GlobalRole>(roles));
      if (!normalized.includes('user')) {
        normalized.push('user');
      }
      if (this.currentUser?.roles?.includes('admin') && !normalized.includes('admin')) {
        normalized.push('admin');
      }
      updatePayload.roles = normalized;
    }

    const passwordGroup = formValue.passwords;
    // Senden Sie die Passwörter nur, wenn das neue Passwort-Feld ausgefüllt ist.
    if (passwordGroup.newPassword) {
      updatePayload.oldPassword = passwordGroup.oldPassword;
      updatePayload.newPassword = passwordGroup.newPassword;
    }

    this.apiService.updateCurrentUser(updatePayload).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (formValue.email && oldEmail && formValue.email !== oldEmail) {
          this.profileForm.patchValue({ email: oldEmail });
        }
        const msg = res?.message || 'Profil erfolgreich aktualisiert!';
        this.notification.success(msg);
        this.profileForm.get('passwords')?.reset();
      },
      error: (err) => {
        this.notification.error(err);
      }
    });
  }

  onLeaveChoir(choir: Choir): void {
    if (this.isDemoUser) {
      return;
    }
    const multipleChoirs = this.choirList.length > 1;
    this.dialogHelper.confirm({
      title: 'Abmeldung bestätigen',
      message: multipleChoirs
        ? `Möchtest du dich wirklich vom Chor "${choir.name}" abmelden?`
        : `Wenn du dich vom Chor "${choir.name}" abmeldest, wird dein Profil vollständig gelöscht.`,
      confirmButtonText: 'Abmelden',
      cancelButtonText: 'Abbrechen'
    }).subscribe(confirmed => {
      if (!confirmed) {
        return;
      }
      this.apiService.leaveChoir(choir.id).pipe(takeUntil(this.destroy$)).subscribe({
        next: (response) => this.handleMembershipChange(response, `Du hast den Chor ${choir.name} verlassen.`),
        error: (err) => {
          this.notification.error(err);
        }
      });
    });
  }

  onDeleteAccount(): void {
    if (this.isDemoUser) {
      return;
    }
    this.dialogHelper.confirm({
      title: 'Vom System abmelden',
      message: 'Möchtest du dich wirklich vom gesamten System abmelden? Dein Profil wird dauerhaft gelöscht.',
      confirmButtonText: 'Profil löschen',
      cancelButtonText: 'Abbrechen'
    }).subscribe(confirmed => {
      if (!confirmed) {
        return;
      }
      this.apiService.deleteMyAccount().pipe(takeUntil(this.destroy$)).subscribe({
        next: (response) => this.handleMembershipChange(response, 'Dein Profil wurde gelöscht.'),
        error: (err) => {
          this.notification.error(err);
        }
      });
    });
  }

  private updateFormAccess(): void {
    if (!this.profileForm) {
      return;
    }
    if (this.isDemoUser) {
      this.profileForm.disable({ emitEvent: false });
      return;
    }

    this.profileForm.enable({ emitEvent: false });
    const rolesControl = this.profileForm.get('roles');
    if (this.currentUser?.roles?.includes('admin')) {
      rolesControl?.enable({ emitEvent: false });
    } else {
      rolesControl?.disable({ emitEvent: false });
    }
  }

  private handleMembershipChange(response: LeaveChoirResponse, fallback: string): void {
    const message = response?.message || fallback;
    if (response?.accountDeleted) {
      this.notification.success(message, 5000);
      this.authService.logout();
      return;
    }

    if (response?.accessToken) {
      localStorage.setItem('auth-token', response.accessToken);
    }

    this.apiService.getCurrentUser().pipe(takeUntil(this.destroy$)).subscribe({
      next: (user) => {
        this.authService.setCurrentUser(user);
        this.currentUser = user;
        this.notification.success(message, 4000);
      },
      error: () => {
        this.notification.success(message, 4000);
      }
    });
  }

  async onRequestPushPermission(): Promise<void> {
    try {
      this.pushPermission = (await this.pushService.requestPermission()) as PushPermission;
      if (this.pushPermission === 'granted') {
        this.notification.success('Push-Benachrichtigungen sind aktiviert.');
      } else if (this.pushPermission === 'denied') {
        this.notification.warning('Push-Benachrichtigungen wurden im Browser blockiert.');
      }
    } catch (err) {
      this.notification.error(err);
    }
  }

  async onTogglePushMaster(enabled: boolean): Promise<void> {
    if (!enabled) {
      this.isPushUpdating = true;
      try {
        await this.pushService.clearAllSubscriptions();
        this.refreshPushStates(true);
        this.notification.info('Push-Benachrichtigungen wurden deaktiviert.');
      } catch (err) {
        this.notification.error(err);
      } finally {
        this.isPushUpdating = false;
      }
      return;
    }

    await this.onRequestPushPermission();
  }

  async onToggleChoirPush(choirId: number, enabled: boolean): Promise<void> {
    if (!this.pushSupported) return;
    if (this.pushPermission !== 'granted') {
      await this.onRequestPushPermission();
      if (this.pushPermission !== 'granted') {
        this.refreshPushStates();
        return;
      }
    }

    this.isPushUpdating = true;
    try {
      if (enabled) {
        await this.pushService.subscribeToChoir(choirId);
        this.notification.success('Push-Benachrichtigungen aktiviert.');
      } else {
        await this.pushService.unsubscribeFromChoir(choirId);
        this.notification.info('Push-Benachrichtigungen deaktiviert.');
      }
      this.refreshPushStates();
    } catch (err) {
      this.notification.error(err);
      this.refreshPushStates();
    } finally {
      this.isPushUpdating = false;
    }
  }

  private refreshPushStates(clearAll: boolean = false): void {
    if (clearAll) {
      this.pushStates = {};
      return;
    }

    const enabledChoirs = new Set(this.pushService.getStoredChoirIds());
    const next: Record<number, boolean> = {};
    for (const choir of this.choirList) {
      next[choir.id] = enabledChoirs.has(choir.id);
    }
    this.pushStates = next;
  }
}
