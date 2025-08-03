import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { LibraryItem } from '@core/models/library-item';
import { Observable } from 'rxjs';
import { AuthService } from '@core/services/auth.service';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [CommonModule, MaterialModule, ReactiveFormsModule],
  templateUrl: './library.component.html',
  styleUrls: ['./library.component.scss']
})
export class LibraryComponent implements OnInit {
  items$!: Observable<LibraryItem[]>;
  selectedFile: File | null = null;
  isAdmin = false;
  displayedColumns: string[] = ['title', 'copies', 'status', 'availableAt'];
  form!: FormGroup;

  constructor(private api: ApiService, private auth: AuthService, private fb: FormBuilder) {}

  ngOnInit(): void {
    this.load();
    this.auth.isAdmin$.subscribe(a => this.isAdmin = a);
    this.form = this.fb.group({
      pieceId: [null, Validators.required],
      collectionId: [null, Validators.required],
      copies: [1, [Validators.required, Validators.min(1)]],
      isBorrowed: [false]
    });
  }

  load(): void {
    this.items$ = this.api.getLibraryItems();
  }

  onFileChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  upload(): void {
    if (this.selectedFile) {
      this.api.importLibraryCsv(this.selectedFile).subscribe(() => this.load());
    }
  }

  add(): void {
    if (this.form.valid) {
      this.api.addLibraryItem(this.form.value).subscribe(() => {
        this.load();
        this.form.reset({ copies: 1, isBorrowed: false });
      });
    }
  }
}
