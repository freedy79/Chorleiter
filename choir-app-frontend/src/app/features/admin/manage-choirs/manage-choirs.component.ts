import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from 'src/app/core/services/api.service';
import { Choir } from 'src/app/core/models/choir';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { ChoirDialogComponent } from './choir-dialog/choir-dialog.component';

@Component({
  selector: 'app-manage-choirs',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './manage-choirs.component.html',
  styleUrls: ['./manage-choirs.component.scss']
})
export class ManageChoirsComponent implements OnInit {
  choirs: Choir[] = [];
  displayedColumns = ['name', 'location', 'memberCount', 'eventCount', 'pieceCount', 'actions'];
  dataSource = new MatTableDataSource<Choir>();

  constructor(private api: ApiService, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.loadChoirs();
  }

  loadChoirs(): void {
    this.api.getAdminChoirs().subscribe(data => {
      this.choirs = data;
      this.dataSource.data = data;
    });
  }

  addChoir(): void {
    const ref = this.dialog.open(ChoirDialogComponent, { width: '400px' });
    ref.afterClosed().subscribe(result => {
      if (result) {
        this.api.createChoir(result).subscribe(() => this.loadChoirs());
      }
    });
  }

  editChoir(choir: Choir): void {
    const ref = this.dialog.open(ChoirDialogComponent, { width: '600px', data: choir });
    ref.afterClosed().subscribe(result => {
      if (result) {
        this.api.updateChoir(choir.id, result).subscribe(() => this.loadChoirs());
      } else {
        this.loadChoirs();
      }
    });
  }

  deleteChoir(choir: Choir): void {
    if (confirm('Delete choir?')) {
      this.api.deleteChoir(choir.id).subscribe(() => this.loadChoirs());
    }
  }
}
