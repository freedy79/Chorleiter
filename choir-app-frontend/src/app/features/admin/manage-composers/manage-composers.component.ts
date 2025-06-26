import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/core/services/api.service'; // Sie müssten den ApiService erweitern
import { Composer } from 'src/app/core/models/composer';
import { MatTableDataSource } from '@angular/material/table';
import { MaterialModule } from '@modules/material.module';
import { CommonModule } from '@angular/common';
// ...
@Component({
  selector: 'app-admin-manage-composers',
  templateUrl: './manage-composers.component.html',
  styleUrl: './manage-composers.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    MaterialModule,
  ]
})
export class ManageComposersComponent implements OnInit {
  composers: Composer[] = [];
  displayedColumns = ['id', 'name', 'actions'];
  dataSource = new MatTableDataSource<Composer>();

  constructor(private adminApiService: ApiService) {} // Erweitern Sie den ApiService oder erstellen Sie einen AdminApiService

  ngOnInit() {
    // this.adminApiService.getAdminComposers().subscribe(data => {
    //   this.composers = data;
    //   this.dataSource.data = data;
    // });
  }

  // Methoden für addComposer, editComposer, deleteComposer...
}
