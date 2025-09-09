import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { District } from '@core/models/district';
import { MatTableDataSource } from '@angular/material/table';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-manage-districts',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './manage-districts.component.html',
  styleUrls: ['./manage-districts.component.scss']
})
export class ManageDistrictsComponent implements OnInit, OnDestroy {
  displayedColumns = ['name', 'actions'];
  dataSource = new MatTableDataSource<District>([]);
  form: FormGroup;
  private destroy$ = new Subject<void>();

  constructor(private api: ApiService, private fb: FormBuilder) {
    this.form = this.fb.group({ name: [''] });
  }

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.api.getDistricts().pipe(takeUntil(this.destroy$)).subscribe(ds => {
      this.dataSource.data = ds;
    });
  }

  add(): void {
    const name = this.form.value.name?.trim();
    if (!name) { return; }
    this.api.createDistrict(name).pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.form.reset();
      this.load();
    });
  }

  delete(d: District): void {
    if (confirm(`Bezirk "${d.name}" löschen?`)) {
      this.api.deleteDistrict(d.id).pipe(takeUntil(this.destroy$)).subscribe(() => this.load());
    }
  }
}
