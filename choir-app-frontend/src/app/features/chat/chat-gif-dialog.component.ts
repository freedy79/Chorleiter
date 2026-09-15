import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';

import { MaterialModule } from '@modules/material.module';
import { GifSearchItem, GifSearchService } from '@core/services/gif-search.service';

@Component({
  selector: 'app-chat-gif-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule],
  templateUrl: './chat-gif-dialog.component.html',
  styleUrls: ['./chat-gif-dialog.component.scss']
})
export class ChatGifDialogComponent implements OnInit {
  query = '';
  loading = false;
  searched = false;
  items: GifSearchItem[] = [];

  constructor(
    private readonly gifService: GifSearchService,
    private readonly dialogRef: MatDialogRef<ChatGifDialogComponent, string>
  ) {}

  ngOnInit(): void {
    this.loadTrending();
  }

  search(): void {
    const normalized = this.query.trim();
    if (!normalized) {
      this.loadTrending();
      return;
    }

    this.loading = true;
    this.searched = true;
    this.gifService.search(normalized).subscribe({
      next: items => {
        this.items = items;
        this.loading = false;
      },
      error: () => {
        this.items = [];
        this.loading = false;
      }
    });
  }

  pickGif(item: GifSearchItem): void {
    this.dialogRef.close(`![](${item.url})`);
  }

  close(): void {
    this.dialogRef.close();
  }

  private loadTrending(): void {
    this.loading = true;
    this.searched = false;

    this.gifService.trending().subscribe({
      next: items => {
        this.items = items;
        this.loading = false;
      },
      error: () => {
        this.items = [];
        this.loading = false;
      }
    });
  }
}
