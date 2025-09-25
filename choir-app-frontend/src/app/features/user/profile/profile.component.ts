import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';

import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { LeaveChoirResponse, User, GlobalRole } from '@core/models/user';
import { Choir } from '@core/models/choir';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '@core/services/auth.service';
import { District } from '@core/models/district';
import { Congregation } from '@core/models/congregation';
import { ConfirmDialogComponent, ConfirmDialogData } from '@shared/components/confirm-dialog/confirm-dialog.component';

export function passwordsMatchValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const newPassword = control.get('newPassword')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    return newPassword && confirmPassword && newPassword !== confirmPassword ? { passwordsMismatch: true } : null;
  };
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MaterialModule,
    ConfirmDialogComponent
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
  private destroy$ = new Subject<void>();
  private isDemoUser = false;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private authService: AuthService,
    private dialog: MatDialog
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
        newPassword: [''],
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
      .subscribe(choirs => this.choirList = Array.isArray(choirs) ? choirs : []);
    this.apiService.getDistricts().subscribe(ds => this.districts = ds);
    this.apiService.getCongregations().subscribe(cs => this.congregations = cs);
    this.apiService.getCurrentUser().subscribe({
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
          this.snackBar.open('Bitte ergänze dein Profil um Gemeinde und Bezirk.', 'OK', { duration: 10000, verticalPosition: 'top' });
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load user profile', err);
        this.isLoading = false;
      }
    });
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
    const trimmedPhone = typeof formValue.phone === 'string' ? formValue.phone.trim() : formValue.phone;
    const updatePayload: { firstName?: string; name?: string; email?: string; phone?: string | null; street?: string; postalCode?: string; city?: string; congregation?: string; district?: string; voice?: string; shareWithChoir?: boolean; oldPassword?: string; newPassword?: string; roles?: GlobalRole[] } = {
      firstName: formValue.firstName,
      name: formValue.name,
      email: formValue.email,
      phone: trimmedPhone,
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

    this.apiService.updateCurrentUser(updatePayload).subscribe({
      next: (res) => {
        if (formValue.email && oldEmail && formValue.email !== oldEmail) {
          this.profileForm.patchValue({ email: oldEmail });
        }
        const msg = res?.message || 'Profil erfolgreich aktualisiert!';
        this.snackBar.open(msg, 'OK', { duration: 3000, verticalPosition: 'top' });
        this.profileForm.get('passwords')?.reset();
      },
      error: (err) => {
        const errorMessage = err.error?.message || 'Profilaktualisierung fehlgeschlagen.';
        this.snackBar.open(errorMessage, 'Schließen', { duration: 5000,  verticalPosition: 'top'  });
      }
    });
  }

  onLeaveChoir(choir: Choir): void {
    if (this.isDemoUser) {
      return;
    }
    const multipleChoirs = this.choirList.length > 1;
    const dialogData: ConfirmDialogData = {
      title: 'Abmeldung bestätigen',
      message: multipleChoirs
        ? `Möchtest du dich wirklich vom Chor "${choir.name}" abmelden?`
        : `Wenn du dich vom Chor "${choir.name}" abmeldest, wird dein Profil vollständig gelöscht.`,
      confirmButtonText: 'Abmelden',
      cancelButtonText: 'Abbrechen'
    };
    const dialogRef = this.dialog.open(ConfirmDialogComponent, { data: dialogData });
    dialogRef.afterClosed().subscribe(confirmed => {
      if (!confirmed) {
        return;
      }
      this.apiService.leaveChoir(choir.id).subscribe({
        next: (response) => this.handleMembershipChange(response, `Du hast den Chor ${choir.name} verlassen.`),
        error: (err) => {
          const message = err.error?.message || 'Abmeldung fehlgeschlagen.';
          this.snackBar.open(message, 'Schließen', { duration: 5000, verticalPosition: 'top' });
        }
      });
    });
  }

  onDeleteAccount(): void {
    if (this.isDemoUser) {
      return;
    }
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Vom System abmelden',
        message: 'Möchtest du dich wirklich vom gesamten System abmelden? Dein Profil wird dauerhaft gelöscht.',
        confirmButtonText: 'Profil löschen',
        cancelButtonText: 'Abbrechen'
      }
    });
    dialogRef.afterClosed().subscribe(confirmed => {
      if (!confirmed) {
        return;
      }
      this.apiService.deleteMyAccount().subscribe({
        next: (response) => this.handleMembershipChange(response, 'Dein Profil wurde gelöscht.'),
        error: (err) => {
          const message = err.error?.message || 'Abmeldung fehlgeschlagen.';
          this.snackBar.open(message, 'Schließen', { duration: 5000, verticalPosition: 'top' });
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
      this.snackBar.open(message, 'OK', { duration: 5000, verticalPosition: 'top' });
      this.authService.logout();
      return;
    }

    if (response?.accessToken) {
      localStorage.setItem('auth-token', response.accessToken);
    }

    this.apiService.getCurrentUser().subscribe({
      next: (user) => {
        this.authService.setCurrentUser(user);
        this.currentUser = user;
        this.snackBar.open(message, 'OK', { duration: 4000, verticalPosition: 'top' });
      },
      error: () => {
        this.snackBar.open(message, 'OK', { duration: 4000, verticalPosition: 'top' });
      }
    });
  }
}
