import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { Congregation } from '@core/models/congregation';
import { District } from '@core/models/district';
import { MatTableDataSource } from '@angular/material/table';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-manage-congregations',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './manage-congregations.component.html',
  styleUrls: ['./manage-congregations.component.scss']
})
export class ManageCongregationsComponent implements OnInit, OnDestroy {
  displayedColumns = ['name', 'district', 'actions'];
  dataSource = new MatTableDataSource<Congregation>([]);
  form: FormGroup;
  editing: Congregation | null = null;
  districts: District[] = [];
  private destroy$ = new Subject<void>();

  constructor(private api: ApiService, private fb: FormBuilder) {
    this.form = this.fb.group({ name: [''], districtId: [null] });
  }

  ngOnInit(): void {
    this.load();
    this.api.getDistricts().subscribe(ds => this.districts = ds);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.api.getCongregations().pipe(takeUntil(this.destroy$)).subscribe(cs => {
      this.dataSource.data = cs;
    });
  }

  save(): void {
    const name = this.form.value.name?.trim();
    const districtId = this.form.value.districtId;
    if (!name || !districtId) { return; }
    if (this.editing) {
      this.api.updateCongregation(this.editing.id, name, districtId).pipe(takeUntil(this.destroy$)).subscribe(() => {
        this.editing = null;
        this.form.reset();
        this.load();
      });
    } else {
      this.api.createCongregation(name, districtId).pipe(takeUntil(this.destroy$)).subscribe(() => {
        this.form.reset();
        this.load();
      });
    }
  }

  edit(c: Congregation): void {
    this.editing = c;
    this.form.setValue({ name: c.name, districtId: c.districtId });
  }

  cancel(): void {
    this.editing = null;
    this.form.reset();
  }

  delete(c: Congregation): void {
    if (confirm(`Gemeinde "${c.name}" löschen?`)) {
      this.api.deleteCongregation(c.id).pipe(takeUntil(this.destroy$)).subscribe(() => this.load());
    }
  }

  districtName(id: number): string {
    return this.districts.find(d => d.id === id)?.name || '';
  }
}
