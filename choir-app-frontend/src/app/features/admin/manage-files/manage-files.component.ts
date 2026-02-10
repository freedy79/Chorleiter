import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { RouterModule } from '@angular/router';
import { ApiService } from 'src/app/core/services/api.service';
import { DialogHelperService } from '@core/services/dialog-helper.service';
import { BackendFile, UploadOverview } from 'src/app/core/models/backend-file';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-manage-files',
  standalone: true,
  imports: [CommonModule, MaterialModule, RouterModule],
  templateUrl: './manage-files.component.html',
  styleUrls: ['./manage-files.component.scss']
})
export class ManageFilesComponent implements OnInit {
  covers: BackendFile[] = [];
  images: BackendFile[] = [];
  files: BackendFile[] = [];
  displayedColumns = ['filename', 'linked', 'actions'];
  displayedFileColumns = ['filename', 'downloadName', 'linked', 'actions'];
  private readonly apiBase = typeof environment.apiUrl === 'string' ? environment.apiUrl.replace(/\/api\/?$/, '') : '';

  constructor(
    private api: ApiService,
    private dialogHelper: DialogHelperService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.api.listUploadFiles().subscribe((data: UploadOverview) => {
      this.covers = data.covers;
      this.images = data.images;
      this.files = data.files;
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

  getFileUrl(filename: string): string {
    return `${this.apiBase}/uploads/piece-files/${encodeURIComponent(filename)}`;
  }
}
