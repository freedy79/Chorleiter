import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { PracticeList, PracticeListMembershipResponse } from '@core/models/practice-list';
import { PracticeListService } from '@core/services/practice-list.service';
import { NotificationService } from '@core/services/notification.service';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

interface AddToPracticeListDialogData {
  pieceId: number;
  pieceTitle: string;
  pieceLinkId?: number | null;
  pieceLinkDescription?: string;
  preselectPinOffline?: boolean;
}

export interface AddToPracticeListDialogResult {
  changed: boolean;
  addedItems: Array<{ listId: number; listTitle: string; itemId: number }>;
}

@Component({
  selector: 'app-add-to-practice-list-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule, MatDialogModule],
  template: `
    <h1 mat-dialog-title>Zu Übungsliste hinzufügen</h1>
    <mat-dialog-content class="dialog-content">
      <p><strong>{{ data.pieceTitle }}</strong></p>
      <p *ngIf="data.pieceLinkDescription">Medium: {{ data.pieceLinkDescription }}</p>

      <div class="toolbar-row">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Liste suchen</mat-label>
          <input matInput [(ngModel)]="searchText" placeholder="Titel filtern" />
          <button
            mat-icon-button
            matSuffix
            type="button"
            matTooltip="Suche leeren"
            *ngIf="searchText"
            (click)="searchText = ''"
          >
            <mat-icon>close</mat-icon>
          </button>
        </mat-form-field>

        <button
          mat-icon-button
          type="button"
          color="primary"
          matTooltip="Neue Übungsliste"
          aria-label="Neue Übungsliste"
          (click)="toggleCreateMode()"
        >
          <mat-icon>{{ creatingInline ? 'remove' : 'playlist_add' }}</mat-icon>
        </button>
      </div>

      <div class="inline-create" *ngIf="creatingInline">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Listenname</mat-label>
          <input
            matInput
            [(ngModel)]="newListName"
            maxlength="60"
            placeholder="z. B. Altstimmen Probe"
            (keyup.enter)="createListInline()"
          />
          <mat-hint align="end">{{ newListName.length }}/60</mat-hint>
        </mat-form-field>

        <button
          mat-icon-button
          type="button"
          color="primary"
          [disabled]="!canCreateInline() || creatingList"
          matTooltip="Liste erstellen"
          aria-label="Liste erstellen"
          (click)="createListInline()"
        >
          <mat-icon>check</mat-icon>
        </button>
      </div>

      <div class="similar-hint" *ngIf="similarNames.length">
        Ähnliche Namen: {{ similarNames.join(', ') }}
      </div>

      <mat-progress-bar *ngIf="loading" mode="indeterminate"></mat-progress-bar>

      <div class="list-section" *ngIf="!loading">
        <div class="section-label" *ngIf="recentLists.length">Zuletzt verwendet</div>
        <mat-selection-list>
          <mat-list-option
            *ngFor="let list of recentLists"
            [selected]="isSelected(list.id)"
            (selectedChange)="toggleListSelection(list.id, $event)"
          >
            <div class="list-title">{{ list.title }}</div>
            <div class="list-sub" *ngIf="isAlreadyIncluded(list.id)">Bereits enthalten</div>
          </mat-list-option>
        </mat-selection-list>

        <div class="section-label" *ngIf="otherLists.length">Weitere Listen</div>
        <mat-selection-list>
          <mat-list-option
            *ngFor="let list of otherLists"
            [selected]="isSelected(list.id)"
            (selectedChange)="toggleListSelection(list.id, $event)"
          >
            <div class="list-title">{{ list.title }}</div>
            <div class="list-sub" *ngIf="isAlreadyIncluded(list.id)">Bereits enthalten</div>
          </mat-list-option>
        </mat-selection-list>
      </div>

      <div class="empty" *ngIf="!recentLists.length && !otherLists.length && !loading">
        Keine Übungslisten gefunden.
      </div>

      <div class="save-error" *ngIf="lastSaveError">
        <mat-icon color="warn">warning</mat-icon>
        <span>{{ lastSaveError }}</span>
        <button mat-stroked-button type="button" (click)="submit()" [disabled]="saving || loading || !selectedListIds.size">
          Erneut versuchen
        </button>
      </div>

      <mat-checkbox [(ngModel)]="pinOffline" [disabled]="!data.pieceLinkId">
        Offline pinnen
      </mat-checkbox>
      <div class="hint" *ngIf="!data.pieceLinkId">
        Offline-Pin ist nur für Medienlinks verfügbar.
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="closeWithoutChanges()">Abbrechen</button>
      <button mat-flat-button color="primary" (click)="submit()" [disabled]="!selectedListIds.size || saving || loading">
        Fertig
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width { width: 100%; }
    .hint { margin-top: 0.5rem; opacity: 0.75; }
    .dialog-content { min-width: min(92vw, 540px); }
    .toolbar-row { display: flex; align-items: center; gap: 0.5rem; }
    .inline-create { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
    .similar-hint { margin-bottom: 0.5rem; font-size: 0.85rem; opacity: 0.75; }
    .section-label { margin: 0.5rem 0 0.25rem; font-weight: 600; font-size: 0.9rem; opacity: 0.85; }
    .list-title { font-weight: 500; }
    .list-sub { font-size: 0.8rem; opacity: 0.75; }
    .empty { margin: 0.75rem 0; opacity: 0.7; }
    .save-error { margin: 0.75rem 0; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; color: #b71c1c; }
  `]
})
export class AddToPracticeListDialogComponent implements OnInit {
  lists: PracticeList[] = [];
  selectedListIds = new Set<number>();
  existingListIds = new Set<number>();
  searchText = '';
  loading = false;
  pinOffline = false;
  saving = false;
  creatingInline = false;
  creatingList = false;
  newListName = '';
  lastSaveError = '';
  private addedItemsByListId = new Map<number, { listId: number; listTitle: string; itemId: number }>();

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: AddToPracticeListDialogData,
    private dialogRef: MatDialogRef<AddToPracticeListDialogComponent, AddToPracticeListDialogResult>,
    private practiceListService: PracticeListService,
    private notification: NotificationService
  ) {}

  ngOnInit(): void {
    this.pinOffline = !!this.data.preselectPinOffline && !!this.data.pieceLinkId;
    this.loadListsAndMembership();
  }

  get filteredLists(): PracticeList[] {
    const q = this.searchText.trim().toLowerCase();
    if (!q) {
      return this.lists;
    }
    return this.lists.filter(list => (list.title || '').toLowerCase().includes(q));
  }

  get recentLists(): PracticeList[] {
    return this.filteredLists.slice(0, 5);
  }

  get otherLists(): PracticeList[] {
    return this.filteredLists.slice(5);
  }

  get similarNames(): string[] {
    const q = this.newListName.trim().toLowerCase();
    if (!q || q.length < 3) {
      return [];
    }
    return this.lists
      .map(l => l.title)
      .filter((title): title is string => !!title)
      .filter(title => title.toLowerCase().includes(q))
      .slice(0, 3);
  }

  isSelected(listId: number): boolean {
    return this.selectedListIds.has(listId);
  }

  isAlreadyIncluded(listId: number): boolean {
    return this.existingListIds.has(listId);
  }

  toggleListSelection(listId: number, selected: boolean): void {
    if (selected) {
      this.selectedListIds.add(listId);
      return;
    }
    this.selectedListIds.delete(listId);
  }

  toggleCreateMode(): void {
    this.creatingInline = !this.creatingInline;
    if (!this.creatingInline) {
      this.newListName = '';
    }
  }

  canCreateInline(): boolean {
    const normalized = this.newListName.trim();
    return normalized.length > 0 && normalized.length <= 60;
  }

  createListInline(): void {
    const title = this.newListName.trim();
    if (!title || title.length > 60) {
      return;
    }

    this.creatingList = true;
    this.practiceListService.createList({ title }).subscribe({
      next: (created) => {
        this.lists = [created, ...this.lists.filter(l => l.id !== created.id)];
        this.selectedListIds.add(created.id);
        this.creatingList = false;
        this.creatingInline = false;
        this.newListName = '';
        this.notification.success(`Übungsliste „${created.title}“ erstellt.`);
      },
      error: (error) => {
        this.notification.error(this.getFriendlyErrorMessage(error, 'Die Übungsliste konnte nicht erstellt werden'));
        this.creatingList = false;
      }
    });
  }

  submit(): void {
    const listIds = Array.from(this.selectedListIds);
    if (!listIds.length) {
      return;
    }

    this.lastSaveError = '';
    this.saving = true;
    this.addedItemsByListId.clear();
    const shouldPin = !!this.pinOffline && !!this.data.pieceLinkId;
    const listTitleById = new Map(this.lists.map((list) => [list.id, list.title || `Liste #${list.id}`]));

    forkJoin(
      listIds.map((listId) =>
        this.practiceListService.addItem(listId, {
          pieceId: this.data.pieceId,
          pieceLinkId: this.data.pieceLinkId || null,
          isPinnedOffline: shouldPin
        }).pipe(
          map((item) => ({ ok: true as const, listId, item })),
          catchError((error) => of({ ok: false as const, listId, item: null, error }))
        )
      )
    ).pipe(
      switchMap((results) => {
        const successfulAdds = results.filter((result) => result.ok && result.item);
        const failedListIds = results.filter((result) => !result.ok).map((result) => result.listId);
        const failedResults = results.filter((result) => !result.ok);

        for (const result of successfulAdds) {
          const listTitle = listTitleById.get(result.listId) || `Liste #${result.listId}`;
          this.addedItemsByListId.set(result.listId, {
            listId: result.listId,
            listTitle,
            itemId: Number(result.item!.id)
          });
        }

        if (failedListIds.length) {
          this.selectedListIds = new Set(failedListIds);
          this.saving = false;
          const failedTitles = failedListIds.map(id => listTitleById.get(id) || `Liste #${id}`);
          const firstError = failedResults[0]?.error;
          const reason = this.getFriendlyErrorSuffix(firstError);
          this.lastSaveError = `Speichern fehlgeschlagen für: ${failedTitles.join(', ')}${reason}`;
          this.notification.warning(
            successfulAdds.length
              ? 'Teilweise gespeichert. Fehlende Listen können direkt erneut versucht werden.'
              : 'Speichern fehlgeschlagen. Bitte erneut versuchen.'
          );
          return of([]);
        }

        const items = successfulAdds.map((result) => result.item!);
        if (!shouldPin) {
          return of(items);
        }

        return forkJoin(
          items.map((item, idx) => this.practiceListService.pinItem(listIds[idx], item.id).pipe(catchError(() => of({ message: '' }))))
        ).pipe(switchMap(() => of(items)));
      })
    ).subscribe({
      next: () => {
        const addedItems = Array.from(this.addedItemsByListId.values());
        const result: AddToPracticeListDialogResult = {
          changed: addedItems.length > 0,
          addedItems
        };

        if (!shouldPin) {
          this.close(result);
          return;
        }

        this.practiceListService.refreshOfflinePins().subscribe({
          next: () => this.close(result),
          error: () => this.close(result)
        });
      },
      error: (error) => {
        this.lastSaveError = this.getFriendlyErrorMessage(error, 'Eintrag konnte nicht hinzugefügt werden');
        this.notification.error(this.lastSaveError);
        this.saving = false;
      }
    });
  }

  close(result: AddToPracticeListDialogResult): void {
    this.dialogRef.close(result);
  }

  closeWithoutChanges(): void {
    this.dialogRef.close({ changed: false, addedItems: [] });
  }

  private loadListsAndMembership(): void {
    this.loading = true;
    this.practiceListService.getLists().pipe(
      switchMap((lists) => {
        this.lists = lists;
        if (!lists.length) {
          return of({ pieceId: this.data.pieceId, pieceLinkId: this.data.pieceLinkId || null, listIds: [], memberships: [] } as PracticeListMembershipResponse);
        }
        return this.practiceListService.getMembership(this.data.pieceId, this.data.pieceLinkId ?? null).pipe(
          catchError(() => of({ pieceId: this.data.pieceId, pieceLinkId: this.data.pieceLinkId || null, listIds: [], memberships: [] } as PracticeListMembershipResponse))
        );
      })
    ).subscribe({
      next: (membership) => {
        this.existingListIds = new Set((membership?.listIds || []).map(id => Number(id)));
        this.loading = false;
      },
      error: (error) => {
        this.notification.error(this.getFriendlyErrorMessage(error, 'Übungslisten konnten nicht geladen werden'));
        this.loading = false;
      }
    });
  }

  private getFriendlyErrorMessage(error: unknown, fallback: string): string {
    const httpError = error as HttpErrorResponse | undefined;
    if (!httpError) {
      return `${fallback}.`;
    }

    if (httpError.status === 0) {
      return `${fallback}: Keine Verbindung zum Server.`;
    }

    if (httpError.status === 400) {
      return `${fallback}: Die Anfrage war ungültig.`;
    }

    if (httpError.status === 401 || httpError.status === 403) {
      return `${fallback}: Es fehlen Berechtigungen.`;
    }

    if (httpError.status >= 500) {
      return `${fallback}: Serverfehler, bitte später erneut versuchen.`;
    }

    return `${fallback}.`;
  }

  private getFriendlyErrorSuffix(error: unknown): string {
    const httpError = error as HttpErrorResponse | undefined;
    if (!httpError) {
      return '';
    }

    if (httpError.status === 0) {
      return ' (keine Verbindung zum Server).';
    }

    if (httpError.status >= 500) {
      return ' (Serverfehler).';
    }

    if (httpError.status === 400) {
      return ' (ungültige Anfrage).';
    }

    return '';
  }
}
