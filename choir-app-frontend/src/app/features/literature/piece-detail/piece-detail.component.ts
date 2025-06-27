import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { Piece } from '@core/models/piece';

@Component({
  selector: 'app-piece-detail',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './piece-detail.component.html',
  styleUrls: ['./piece-detail.component.scss']
})
export class PieceDetailComponent implements OnInit {
  piece?: Piece;

  constructor(private route: ActivatedRoute, private apiService: ApiService) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.apiService.getRepertoirePiece(id).subscribe(p => this.piece = p);
  }
}
