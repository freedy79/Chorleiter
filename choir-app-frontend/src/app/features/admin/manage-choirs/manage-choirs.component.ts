import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from 'src/app/core/services/api.service';
import { Choir } from 'src/app/core/models/choir';
import { DialogHelperService } from '@core/services/dialog-helper.service';
import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { ChoirDialogComponent } from './choir-dialog/choir-dialog.component';
import { BaseListComponent } from '@shared/components/base-list.component';
import { PaginatorService } from '@core/services/paginator.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-manage-choirs',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './manage-choirs.component.html',
  styleUrls: ['./manage-choirs.component.scss']
})
export class ManageChoirsComponent extends BaseListComponent<Choir> {
  displayedColumns = ['name', 'location', 'memberCount', 'eventCount', 'pieceCount', 'actions'];

  constructor(
    paginatorService: PaginatorService,
    private api: ApiService,
    private dialogHelper: DialogHelperService,
    private auth: AuthService,
    private router: Router
  ) {
    super(paginatorService);
  }

  get paginatorKey(): string {
    return 'manage-choirs';
  }

  loadData(): Observable<Choir[]> {
    return this.api.getAdminChoirs();
  }

  addChoir(): void {
    this.dialogHelper.openCreateDialog<
      ChoirDialogComponent,
      { name: string; description?: string; location?: string },
      Choir
    >(
      ChoirDialogComponent,
      (result) => this.api.createChoir(result),
      {
        silent: true,
        onSuccess: () => this.refresh()
      },
      { width: '400px' }
    ).subscribe();
  }

  editChoir(choir: Choir): void {
    this.router.navigate(['/manage-choir'], { queryParams: { choirId: choir.id } }
  );
  }

  deleteChoir(choir: Choir): void {
    this.dialogHelper.confirmDelete(
      { itemName: 'diesen Chor' },
      () => this.api.deleteChoir(choir.id),
      {
        silent: true,
        onSuccess: () => this.refresh()
      }
    ).subscribe();
  }
}
