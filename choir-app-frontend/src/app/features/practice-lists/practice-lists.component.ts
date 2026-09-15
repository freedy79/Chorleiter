import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MaterialModule } from '@modules/material.module';
import { PracticeList, PracticeListCreatePayload } from '@core/models/practice-list';
import { PracticeListService } from '@core/services/practice-list.service';
import { NotificationService } from '@core/services/notification.service';
import { DialogHelperService } from '@core/services/dialog-helper.service';
import { FileSizePipe } from '@shared/pipes/file-size.pipe';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { InlineLoadingComponent } from '@shared/components/inline-loading/inline-loading.component';
import { TextInputDialogComponent } from '@shared/components/text-input-dialog/text-input-dialog.component';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-practice-lists',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MaterialModule, FileSizePipe, EmptyStateComponent, InlineLoadingComponent],
  templateUrl: './practice-lists.component.html',
  styleUrls: ['./practice-lists.component.scss']
})
export class PracticeListsComponent implements OnInit, OnDestroy {
  lists: PracticeList[] = [];
  loading = false;
  creating = false;
  storageUsageBytes = 0;
  private destroy$ = new Subject<void>();
  newList: PracticeListCreatePayload = {
    title: '',
    description: null,
    targetDate: null
  };

  constructor(
    private practiceListService: PracticeListService,
    private notification: NotificationService,
    private dialogHelper: DialogHelperService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadLists();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
    this.dialogHelper.openDialog<TextInputDialogComponent, string | undefined>(
      TextInputDialogComponent,
      {
        data: {
          title: 'Übungsliste umbenennen',
          message: 'Geben Sie einen neuen Titel ein:',
          label: 'Titel',
          placeholder: currentTitle,
          initialValue: currentTitle
        }
      }
    ).pipe(
      takeUntil(this.destroy$)
    ).subscribe(result => {
      const nextTitle = result?.trim();
      if (!nextTitle || nextTitle === currentTitle) {
        return;
      }

      this.practiceListService.updateList(list.id, { title: nextTitle }).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: () => {
          this.notification.success('Titel aktualisiert.');
          this.loadLists();
        },
        error: () => this.notification.error('Titel konnte nicht aktualisiert werden.')
      });
    });
  }

  deleteList(list: PracticeList): void {
    this.dialogHelper.confirm({
      title: 'Übungsliste löschen?',
      message: `Soll die Übungsliste "${list.title}" gelöscht werden?`
    }).pipe(
      takeUntil(this.destroy$)
    ).subscribe(confirmed => {
      if (!confirmed) {
        return;
      }

      this.practiceListService.deleteList(list.id).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: () => {
          this.notification.success('Übungsliste gelöscht.');
          this.practiceListService.refreshOfflinePins().pipe(
            takeUntil(this.destroy$)
          ).subscribe({
            next: () => this.loadLists(),
            error: () => this.loadLists()
          });
        },
        error: () => this.notification.error('Übungsliste konnte nicht gelöscht werden.')
      });
    });
  }

  openList(list: PracticeList): void {
    this.router.navigate(['/practice-lists', list.id]);
  }
}
