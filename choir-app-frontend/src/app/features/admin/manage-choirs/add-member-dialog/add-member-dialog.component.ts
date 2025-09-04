import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from 'src/app/core/services/api.service';
import { User } from 'src/app/core/models/user';
import { Observable, map, startWith } from 'rxjs';

@Component({
  selector: 'app-add-member-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './add-member-dialog.component.html',
})
export class AddMemberDialogComponent implements OnInit {
  form: FormGroup;
  users: User[] = [];
  filteredUsers: Observable<User[]> = new Observable<User[]>();

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<AddMemberDialogComponent>,
    private api: ApiService,
    @Inject(MAT_DIALOG_DATA) public existingMemberIds: number[] = []
  ) {
    this.form = this.fb.group({
      user: ['', Validators.required],
      roles: [['director'], Validators.required],
      isOrganist: [false]
    });
  }

  ngOnInit(): void {
    this.api.getUsers().subscribe(users => {
      this.users = users.filter(u => !this.existingMemberIds.includes(u.id));
      this.filteredUsers = this.form.controls['user'].valueChanges.pipe(
        startWith(''),
        map(value => typeof value === 'string' ? value : value?.email),
        map(val => this.filterUsers(val))
      );
    });
  }

  displayFn(user: User): string {
    return user ? `${user.name}, ${user.firstName} (${user.email})` : '';
  }

  private filterUsers(value: string | undefined): User[] {
    const filterValue = (value || '').toLowerCase();
    return this.users.filter(u =>
      u.email.toLowerCase().includes(filterValue) ||
      (u.name && u.name.toLowerCase().includes(filterValue)) ||
      (u.firstName && u.firstName.toLowerCase().includes(filterValue))
    );
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onAdd(): void {
    if (this.form.valid) {
      const user: User = this.form.value.user;
      const roles = this.form.value.roles as string[];
      const isOrg = this.form.value.isOrganist;
      const finalRoles = isOrg && !roles.includes('organist') ? [...roles, 'organist'] :
        (!isOrg ? roles.filter(r => r !== 'organist') : roles);
      this.dialogRef.close({ email: user.email, roles: finalRoles });
    }
  }
}
