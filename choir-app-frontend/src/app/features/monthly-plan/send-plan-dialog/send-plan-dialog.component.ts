import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { FormsModule } from '@angular/forms';
import { UserInChoir } from '@core/models/user';
import { PersonalAddressBookEntry, MonthlyPlanRecipientPreference } from '@core/models/personal-address-book-entry';
import { PersonalAddressBookService } from '@core/services/personal-address-book.service';
import { MonthlyPlanService } from '@core/services/monthly-plan.service';
import { NotificationService } from '@core/services/notification.service';
import { forkJoin, of, switchMap } from 'rxjs';
import { AddressBookEntryDialogComponent } from './address-book-entry-dialog.component';
import { SaveAddressBookPromptDialogComponent, SaveAddressBookPromptResult } from './save-address-book-prompt-dialog.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '@shared/components/confirm-dialog/confirm-dialog.component';

export interface SendPlanDialogData {
  members: UserInChoir[];
}

export interface SendPlanDialogResult {
  ids: number[];
  addressBookEntryIds: number[];
  emails: string[];
  saveSelection: boolean;
}

interface RecipientOption {
  id: number;
  type: 'user' | 'personal';
  name?: string;
  firstName?: string;
  email: string;
}

@Component({
  selector: 'app-send-plan-dialog',
  standalone: true,
  imports: [CommonModule, MaterialModule, FormsModule],
  templateUrl: './send-plan-dialog.component.html',
  styleUrls: ['./send-plan-dialog.component.scss']
})
export class SendPlanDialogComponent implements OnInit {
  selectedUsers = new Set<number>();
  selectedPersonalEntries = new Set<number>();
  personalEntries: PersonalAddressBookEntry[] = [];
  preference: MonthlyPlanRecipientPreference = { selectedUserIds: [], selectedAddressBookEntryIds: [] };
  emails = '';
  loading = true;
  sending = false;

  constructor(
    public dialogRef: MatDialogRef<SendPlanDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SendPlanDialogData,
    private addressBook: PersonalAddressBookService,
    private monthlyPlan: MonthlyPlanService,
    private dialog: MatDialog,
    private notification: NotificationService
  ) {}

  ngOnInit(): void {
    forkJoin({
      entries: this.addressBook.list(),
      preference: this.monthlyPlan.getEmailRecipientPreference()
    }).subscribe({
      next: ({ entries, preference }) => {
        this.personalEntries = entries;
        this.preference = preference || { selectedUserIds: [], selectedAddressBookEntryIds: [] };
        this.selectedUsers = new Set((this.preference.selectedUserIds || []).filter(id => this.data.members.some(m => m.id === id)));
        this.selectedPersonalEntries = new Set((this.preference.selectedAddressBookEntryIds || []).filter(id => entries.some(e => e.id === id)));
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.notification.error('Empfängerliste konnte nicht vollständig geladen werden.', 4000);
      }
    });
  }

  get options(): RecipientOption[] {
    const users = this.data.members.map(member => ({
      id: member.id,
      type: 'user' as const,
      name: member.name,
      firstName: member.firstName,
      email: member.email
    }));
    const personal = this.personalEntries.map(entry => ({
      id: entry.id,
      type: 'personal' as const,
      name: entry.name,
      firstName: entry.firstName,
      email: entry.email
    }));
    return [...users, ...personal];
  }

  trackByOption(index: number, option: RecipientOption): string {
    return `${option.type}-${option.id}`;
  }

  displayName(option: RecipientOption): string {
    const parts = [option.name, option.firstName].filter(Boolean).join(', ');
    return parts ? `${parts} (${option.email})` : option.email;
  }

  isSelected(option: RecipientOption): boolean {
    return option.type === 'user'
      ? this.selectedUsers.has(option.id)
      : this.selectedPersonalEntries.has(option.id);
  }

  toggle(option: RecipientOption, checked: boolean): void {
    const target = option.type === 'user' ? this.selectedUsers : this.selectedPersonalEntries;
    if (checked) target.add(option.id); else target.delete(option.id);
  }

  parseEmails(): string[] {
    return this.emails
      .split(/[,;\s]+/)
      .map(e => e.trim().toLowerCase())
      .filter(e => e.length > 0);
  }

  get canSend(): boolean {
    return !this.loading && !this.sending && (this.selectedUsers.size > 0 || this.selectedPersonalEntries.size > 0 || this.parseEmails().length > 0);
  }

  send(): void {
    if (!this.canSend) return;
    this.sending = true;
    const parsedEmails = this.parseEmails();

    this.addressBook.checkEmails(parsedEmails).pipe(
      switchMap(result => {
        if (result.invalidEmails.length > 0) {
          this.notification.error(`Ungültige E-Mail-Adresse: ${result.invalidEmails.join(', ')}`, 5000);
          this.sending = false;
          return of(null);
        }

        if (result.newEmails.length === 0) {
          return of({ emails: parsedEmails, saveSelection: true });
        }

        const ref = this.dialog.open(SaveAddressBookPromptDialogComponent, {
          data: { emails: result.newEmails },
          maxWidth: '520px'
        });

        return ref.afterClosed().pipe(
          switchMap((choice: SaveAddressBookPromptResult | undefined) => {
            if (!choice || choice === 'cancel') {
              return of(null);
            }
            if (choice === 'send-only') {
              return of({ emails: parsedEmails, saveSelection: true });
            }
            return this.addressBook.createBulk(result.newEmails).pipe(
              switchMap(entries => {
                entries.forEach(entry => this.selectedPersonalEntries.add(entry.id));
                this.personalEntries = this.mergeEntries(this.personalEntries, entries);
                const savedEmailSet = new Set(entries.map(entry => entry.email.toLowerCase()));
                return of({ emails: parsedEmails.filter(email => !savedEmailSet.has(email.toLowerCase())), saveSelection: true });
              })
            );
          })
        );
      })
    ).subscribe({
      next: result => {
        if (!result) {
          this.sending = false;
          return;
        }
        this.dialogRef.close({
          ids: Array.from(this.selectedUsers),
          addressBookEntryIds: Array.from(this.selectedPersonalEntries),
          emails: result.emails,
          saveSelection: result.saveSelection
        } satisfies SendPlanDialogResult);
      },
      error: () => {
        this.sending = false;
        this.notification.error('Empfänger konnten nicht geprüft werden.', 4000);
      }
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }

  addPersonalEntry(): void {
    const ref = this.dialog.open(AddressBookEntryDialogComponent, { data: {}, maxWidth: '520px' });
    ref.afterClosed().pipe(
      switchMap(result => result ? this.addressBook.create(result) : of(null))
    ).subscribe({
      next: entry => {
        if (!entry) return;
        this.personalEntries = this.mergeEntries(this.personalEntries, [entry]);
        this.selectedPersonalEntries.add(entry.id);
      },
      error: () => this.notification.error('Kontakt konnte nicht gespeichert werden.', 4000)
    });
  }

  editPersonalEntry(entry: PersonalAddressBookEntry, event: MouseEvent): void {
    event.stopPropagation();
    const ref = this.dialog.open(AddressBookEntryDialogComponent, { data: { entry }, maxWidth: '520px' });
    ref.afterClosed().pipe(
      switchMap(result => result ? this.addressBook.update(entry.id, result) : of(null))
    ).subscribe({
      next: updated => {
        if (!updated) return;
        this.personalEntries = this.personalEntries.map(item => item.id === updated.id ? updated : item);
      },
      error: () => this.notification.error('Kontakt konnte nicht aktualisiert werden.', 4000)
    });
  }

  deletePersonalEntry(entry: PersonalAddressBookEntry, event: MouseEvent): void {
    event.stopPropagation();
    const data: ConfirmDialogData = {
      title: 'Kontakt löschen?',
      message: `Möchtest du ${entry.email} wirklich aus deinem persönlichen Adressbuch löschen?`,
      confirmButtonText: 'Löschen'
    };
    const ref = this.dialog.open(ConfirmDialogComponent, { data });
    ref.afterClosed().pipe(
      switchMap(confirmed => confirmed ? this.addressBook.delete(entry.id) : of(null))
    ).subscribe({
      next: result => {
        if (result === null) return;
        this.personalEntries = this.personalEntries.filter(item => item.id !== entry.id);
        this.selectedPersonalEntries.delete(entry.id);
      },
      error: () => this.notification.error('Kontakt konnte nicht gelöscht werden.', 4000)
    });
  }

  getPersonalEntry(option: RecipientOption): PersonalAddressBookEntry | undefined {
    return option.type === 'personal' ? this.personalEntries.find(entry => entry.id === option.id) : undefined;
  }

  private mergeEntries(current: PersonalAddressBookEntry[], incoming: PersonalAddressBookEntry[]): PersonalAddressBookEntry[] {
    const map = new Map(current.map(entry => [entry.id, entry]));
    incoming.forEach(entry => map.set(entry.id, entry));
    return Array.from(map.values()).sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));
  }
}
