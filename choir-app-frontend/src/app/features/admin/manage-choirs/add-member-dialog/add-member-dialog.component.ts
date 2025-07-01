import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from 'src/app/core/services/api.service';
import { User } from 'src/app/core/models/user';
import { Observable, map, startWith } from 'rxjs';

@Component({
  selector: 'app-add-member-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './add-member-dialog.component.html',
  styleUrls: ['./add-member-dialog.component.scss']
})
export class AddMemberDialogComponent implements OnInit {
  form: FormGroup;
  users: User[] = [];
  filteredUsers: Observable<User[]> = new Observable<User[]>();

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<AddMemberDialogComponent>,
    private api: ApiService
  ) {
    this.form = this.fb.group({
      user: ['', Validators.required],
      role: ['director', Validators.required]
    });
  }

  ngOnInit(): void {
    this.api.getUsers().subscribe(users => {
      this.users = users;
      this.filteredUsers = this.form.controls['user'].valueChanges.pipe(
        startWith(''),
        map(value => typeof value === 'string' ? value : value?.email),
        map(val => this.filterUsers(val))
      );
    });
  }

  displayFn(user: User): string {
    return user ? `${user.name} (${user.email})` : '';
  }

  private filterUsers(value: string | undefined): User[] {
    const filterValue = (value || '').toLowerCase();
    return this.users.filter(u =>
      u.email.toLowerCase().includes(filterValue) ||
      (u.name && u.name.toLowerCase().includes(filterValue))
    );
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onAdd(): void {
    if (this.form.valid) {
      const user: User = this.form.value.user;
      const role = this.form.value.role;
      this.dialogRef.close({ email: user.email, role });
    }
  }
}
