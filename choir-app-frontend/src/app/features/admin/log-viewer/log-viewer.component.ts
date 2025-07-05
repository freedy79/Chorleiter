import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from 'src/app/core/services/api.service';

interface LogGroup { date: string; items: any[]; }

@Component({
  selector: 'app-log-viewer',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './log-viewer.component.html',
  styleUrls: ['./log-viewer.component.scss']
})
export class LogViewerComponent implements OnInit {
  files: string[] = [];
  selected = '';
  entries: any[] = [];
  groups: LogGroup[] = [];
  descending = true;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadFiles();
  }

  loadFiles(): void {
    this.api.listLogs().subscribe(f => this.files = f);
  }

  loadLog(): void {
    if (!this.selected) return;
    this.api.getLog(this.selected).subscribe(data => {
      this.entries = data;
      this.groupEntries();
    });
  }

  deleteLog(): void {
    if (!this.selected) return;
    this.api.deleteLog(this.selected).subscribe(() => {
      this.selected = '';
      this.entries = [];
      this.groups = [];
      this.loadFiles();
    });
  }

  toggleSort(): void {
    this.descending = !this.descending;
    this.groupEntries();
  }

  private groupEntries(): void {
    const map = new Map<string, any[]>();
    for (const e of this.entries) {
      const ts: string = e.timestamp || e.date || '';
      const day = ts.slice(0, 10);
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(e);
    }
    const array: LogGroup[] = Array.from(map.entries()).map(([date, items]) => ({ date, items }));
    array.sort((a,b) => this.descending ? (a.date < b.date ? 1 : -1) : (a.date > b.date ? 1 : -1));
    this.groups = array;
  }
}
