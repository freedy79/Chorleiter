import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { ApiService } from 'src/app/core/services/api.service';
import { DialogHelperService } from '@core/services/dialog-helper.service';
import { BackendFile, UploadOverview } from 'src/app/core/models/backend-file';
import { environment } from 'src/environments/environment';
import { ResponsiveService } from '@shared/services/responsive.service';

@Component({
  selector: 'app-manage-files',
  standalone: true,
  imports: [CommonModule, MaterialModule, RouterModule],
  templateUrl: './manage-files.component.html',
  styleUrls: ['./manage-files.component.scss']
})
export class ManageFilesComponent implements OnInit {
  isHandset$: Observable<boolean>;
  covers: BackendFile[] = [];
  images: BackendFile[] = [];
  files: BackendFile[] = [];
  coverStorageBytes = 0;
  imageStorageBytes = 0;
  fileStorageBytes = 0;
  totalStorageBytes = 0;
  displayedColumns = ['filename', 'sizeBytes', 'linked', 'actions'];
  displayedFileColumns = ['filename', 'downloadName', 'sizeBytes', 'linked', 'actions'];
  private readonly apiBase = typeof environment.apiUrl === 'string' ? environment.apiUrl.replace(/\/api\/?$/, '') : '';

  constructor(
    responsive: ResponsiveService,
    private api: ApiService,
    private dialogHelper: DialogHelperService
  ) {
    this.isHandset$ = responsive.isHandset$;
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.api.listUploadFiles().subscribe((data: UploadOverview) => {
      this.covers = data.covers;
      this.images = data.images;
      this.files = data.files;

      this.coverStorageBytes = data.usage?.covers ?? this.sumSize(this.covers);
      this.imageStorageBytes = data.usage?.images ?? this.sumSize(this.images);
      this.fileStorageBytes = data.usage?.files ?? this.sumSize(this.files);
      this.totalStorageBytes = data.usage?.total ?? (this.coverStorageBytes + this.imageStorageBytes + this.fileStorageBytes);
    });
  }

  delete(category: string, filename: string): void {
    this.dialogHelper.confirmDelete(
      { itemName: 'diese Datei' },
      () => this.api.deleteUploadFile(category, filename),
      {
        silent: true,
        onSuccess: () => this.load()
      }
    ).subscribe();
  }

  get unassignedCovers(): number {
    return this.covers.filter((c) => !c.collectionId).length;
  }

  get unassignedImages(): number {
    return this.images.filter((i) => !i.pieceId).length;
  }

  get unassignedFiles(): number {
    return this.files.filter((f) => !f.pieceId).length;
  }

  getImageUrl(filename: string): string {
    return `${this.apiBase}/uploads/piece-images/${encodeURIComponent(filename)}`;
  }

  getCoverUrl(filename: string): string {
    return `${this.apiBase}/uploads/collection-covers/${encodeURIComponent(filename)}`;
  }

  getFileUrl(filename: string): string {
    return `${this.apiBase}/uploads/piece-files/${encodeURIComponent(filename)}`;
  }

  formatSize(bytes: number | null | undefined, decimals: number = 1): string {
    const value = typeof bytes === 'number' && !Number.isNaN(bytes) ? bytes : 0;
    const kilobytes = value / 1024;

    if (kilobytes < 1024) {
      return `${kilobytes.toFixed(decimals)} kB`;
    }

    const megabytes = kilobytes / 1024;
    return `${megabytes.toFixed(decimals)} MB`;
  }

  private sumSize(entries: BackendFile[]): number {
    return entries.reduce((total, entry) => total + (entry.sizeBytes || 0), 0);
  }
}
