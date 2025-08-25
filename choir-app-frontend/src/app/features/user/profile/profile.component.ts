import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';

import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { User } from '@core/models/user';
import { Choir } from '@core/models/choir';
import { Observable } from 'rxjs';
import { AuthService } from '@core/services/auth.service';

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
    MaterialModule
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  profileForm: FormGroup;
  currentUser: User | null = null;
  isLoading = true;
  availableChoirs$: Observable<Choir[]>;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private authService: AuthService
  ) {
    this.availableChoirs$ = this.authService.availableChoirs$;
    this.profileForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      street: [''],
      postalCode: [''],
      city: [''],
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
    this.apiService.getCurrentUser().subscribe({
      next: (user) => {
        this.currentUser = user;
        // Populate the form with the user's current data
        this.profileForm.patchValue({
          name: user.name,
          email: user.email,
          street: user.street || '',
          postalCode: user.postalCode || '',
          city: user.city || '',
          voice: user.voice || '',
          shareWithChoir: !!user.shareWithChoir,
          roles: user.roles || []
        });
        if (user.roles?.includes('admin')) {
          this.profileForm.get('roles')?.enable();
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load user profile', err);
        this.isLoading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.profileForm.invalid) {
      return;
    }

    const formValue = this.profileForm.value;
    const oldEmail = this.currentUser?.email;
    const updatePayload: { name?: string; email?: string; street?: string; postalCode?: string; city?: string; voice?: string; shareWithChoir?: boolean; oldPassword?: string; newPassword?: string; roles?: string[] } = {
      name: formValue.name,
      email: formValue.email,
      street: formValue.street,
      postalCode: formValue.postalCode,
      city: formValue.city,
      voice: formValue.voice,
      shareWithChoir: formValue.shareWithChoir
    };

    if (this.profileForm.get('roles')?.enabled) {
      const roles = formValue.roles as string[];
      updatePayload.roles = roles?.includes('admin') ? roles : [...roles, 'admin'];
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
}
