import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MaterialModule } from '@modules/material.module';
import { PracticeList, PracticeListCreatePayload } from '@core/models/practice-list';
import { PracticeListService } from '@core/services/practice-list.service';
import { NotificationService } from '@core/services/notification.service';
import { FileSizePipe } from '@shared/pipes/file-size.pipe';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { InlineLoadingComponent } from '@shared/components/inline-loading/inline-loading.component';

@Component({
  selector: 'app-practice-lists',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MaterialModule, FileSizePipe, EmptyStateComponent, InlineLoadingComponent],
  templateUrl: './practice-lists.component.html',
  styleUrls: ['./practice-lists.component.scss']
})
export class PracticeListsComponent implements OnInit {
  lists: PracticeList[] = [];
  loading = false;
  creating = false;
  storageUsageBytes = 0;
  newList: PracticeListCreatePayload = {
    title: '',
    description: null,
    targetDate: null
  };

  constructor(
    private practiceListService: PracticeListService,
    private notification: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadLists();
  }

  loadLists(): void {
    this.loading = true;
    this.practiceListService.getLists().subscribe({
      next: (lists) => {
        this.lists = lists;
        this.loading = false;
      },
      error: () => {
        this.notification.error('Übungslisten konnten nicht geladen werden.');
        this.loading = false;
      }
    });

    this.practiceListService.getOfflineStorageUsageBytes()
      .then(bytes => {
        this.storageUsageBytes = bytes;
      })
      .catch(() => {
        this.storageUsageBytes = 0;
      });
  }

  createList(): void {
    const title = (this.newList.title || '').trim();
    if (!title) {
      this.notification.error('Bitte gib einen Titel ein.');
      return;
    }

    this.creating = true;
    this.practiceListService.createList({
      title,
      description: this.newList.description || null,
      targetDate: this.newList.targetDate || null
    }).subscribe({
      next: (created) => {
        this.notification.success('Übungsliste erstellt.');
        this.creating = false;
        this.newList = { title: '', description: null, targetDate: null };
        this.router.navigate(['/practice-lists', created.id]);
      },
      error: () => {
        this.notification.error('Übungsliste konnte nicht erstellt werden.');
        this.creating = false;
      }
    });
  }

  renameList(list: PracticeList): void {
    const currentTitle = list.title || '';
    const nextTitle = window.prompt('Neuer Titel der Übungsliste', currentTitle)?.trim();
    if (!nextTitle || nextTitle === currentTitle) {
      return;
    }

    this.practiceListService.updateList(list.id, { title: nextTitle }).subscribe({
      next: () => {
        this.notification.success('Titel aktualisiert.');
        this.loadLists();
      },
      error: () => this.notification.error('Titel konnte nicht aktualisiert werden.')
    });
  }

  deleteList(list: PracticeList): void {
    const confirmed = window.confirm(`Soll die Übungsliste "${list.title}" gelöscht werden?`);
    if (!confirmed) {
      return;
    }

    this.practiceListService.deleteList(list.id).subscribe({
      next: () => {
        this.notification.success('Übungsliste gelöscht.');
        this.practiceListService.refreshOfflinePins().subscribe({
          next: () => this.loadLists(),
          error: () => this.loadLists()
        });
      },
      error: () => this.notification.error('Übungsliste konnte nicht gelöscht werden.')
    });
  }

  openList(list: PracticeList): void {
    this.router.navigate(['/practice-lists', list.id]);
  }
}
