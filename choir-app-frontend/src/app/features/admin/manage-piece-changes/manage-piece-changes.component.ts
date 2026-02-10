import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { PieceChange } from '@core/models/piece-change';
import { MatTableDataSource } from '@angular/material/table';
import { NotificationService } from '@core/services/notification.service';

@Component({
    selector: 'app-manage-piece-changes',
    standalone: true,
    imports: [CommonModule, MaterialModule],
    templateUrl: './manage-piece-changes.component.html',
    styleUrls: ['./manage-piece-changes.component.scss']
})
export class ManagePieceChangesComponent implements OnInit {
    displayedColumns = ['piece', 'createdAt', 'actions'];
    dataSource = new MatTableDataSource<PieceChange>();

    constructor(private api: ApiService, private notification: NotificationService) {}

    ngOnInit(): void {
        this.loadChanges();
    }

    loadChanges(): void {
        this.api.getPieceChangeRequests().subscribe(data => {
            this.dataSource.data = data;
        });
    }

    approve(change: PieceChange): void {
        this.api.approvePieceChange(change.id).subscribe({
            next: () => {
                this.notification.success('Änderung übernommen', 3000);
                this.loadChanges();
            },
            error: () => this.notification.error('Fehler beim Übernehmen', 3000)
        });
    }

    decline(change: PieceChange): void {
        this.api.deletePieceChange(change.id).subscribe({
            next: () => {
                this.notification.success('Änderung abgelehnt', 3000);
                this.loadChanges();
            },
            error: () => this.notification.error('Fehler beim Ablehnen', 3000)
        });
    }
}
