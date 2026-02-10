import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource } from '@angular/material/table';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { UserInChoir } from '@core/models/user';
import { PersonNamePipe } from '@shared/pipes/person-name.pipe';

@Component({
  selector: 'app-choir-members',
  standalone: true,
  imports: [CommonModule, MaterialModule, PersonNamePipe],
  templateUrl: './choir-members.component.html',
  styleUrls: ['./choir-members.component.scss']
})
export class ChoirMembersComponent implements OnInit {
  displayedColumns: string[] = ['name', 'voice', 'email', 'street', 'postalCode', 'city'];
  dataSource = new MatTableDataSource<UserInChoir>();

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.apiService.getChoirMembers().subscribe(members => {
      this.dataSource.data = members;
    });
  }

  mask(value: string | undefined, share: boolean | undefined): string {
    return share ? (value || '') : '*****';
  }
}
