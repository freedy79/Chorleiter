import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from 'src/app/core/services/api.service';
import { Choir } from 'src/app/core/models/choir';

@Component({
  selector: 'app-add-to-choir-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './add-to-choir-dialog.component.html',
})
export class AddToChoirDialogComponent implements OnInit {
  form: FormGroup;
  choirs: Choir[] = [];

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    public dialogRef: MatDialogRef<AddToChoirDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.form = this.fb.group({
      choir: [null, Validators.required],
      roles: [['singer'], Validators.required],
    });
  }

  ngOnInit(): void {
    this.api.getAdminChoirs().subscribe(choirs => {
      this.choirs = choirs;
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onAdd(): void {
    if (this.form.valid) {
      const choirId = this.form.value.choir;
      const roles = this.form.value.roles as string[];
      this.dialogRef.close({ choirId, roles });
    }
  }
}
