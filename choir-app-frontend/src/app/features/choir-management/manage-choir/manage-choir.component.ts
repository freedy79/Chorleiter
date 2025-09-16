import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { Observable, forkJoin } from 'rxjs';
import { take } from 'rxjs/operators';

import { MaterialModule } from '@modules/material.module';
import { ApiService } from 'src/app/core/services/api.service';
import { Choir } from 'src/app/core/models/choir';
import { UserInChoir } from 'src/app/core/models/user';
import { AuthService } from 'src/app/core/services/auth.service';
import { Collection } from 'src/app/core/models/collection';
import { InviteUserDialogComponent } from '../invite-user-dialog/invite-user-dialog.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { environment } from 'src/environments/environment';
import { ChoirLog } from 'src/app/core/models/choir-log';
import { CollectionCopiesDialogComponent } from '../../collections/collection-copies-dialog.component';
import { LibraryItem } from '@core/models/library-item';


@Component({
  selector: 'app-manage-choir',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, MaterialModule, RouterModule],
  templateUrl: './manage-choir.component.html',
  styleUrls: ['./manage-choir.component.scss']
})
export class ManageChoirComponent implements OnInit {
  choirForm: FormGroup;

  isChoirAdmin = false;
  dienstplanEnabled = false;
  programsEnabled = false;
  joinByLinkEnabled = false;
  isDirector = false;
  isAdmin = false;
  canManageMenu = false;
  singerMenu: Record<string, boolean> = {
    events: true,
    dienstplan: true,
    availability: true,
    participation: true,
    posts: true,
    stats: true,
    manageChoir: true,
    repertoire: true,
    collections: true,
    library: true,
  };
  menuOptions = [
    { key: 'events', label: 'Ereignisse' },
    { key: 'dienstplan', label: 'Dienstplan' },
    { key: 'availability', label: 'Verfügbarkeiten' },
    { key: 'participation', label: 'Beteiligung' },
    { key: 'posts', label: 'Beiträge' },
    { key: 'stats', label: 'Statistik' },
    { key: 'manageChoir', label: 'Mein Chor' },
    { key: 'repertoire', label: 'Repertoire' },
    { key: 'collections', label: 'Sammlungen' },
    { key: 'library', label: 'Bibliothek' },
  ];

  /**
   * Holds the choirId from the query parameter when a global admin
   * manages a different choir. For regular users this remains null.
   */
  adminChoirId: number | null = null;

  sundayWeeks: number[] = [];
  weekdayDay: number | null = null;
  weekdayWeeks: number[] = [];
  private sundayRuleId: number | null = null;
  private weekdayRuleId: number | null = null;


  choirInfoExpanded = true;
  membersExpanded = true;
  choirSettingsExpanded = false;
  joinLink = '';

  displayedCollectionColumns: string[] = ['title', 'publisher', 'actions'];
  collectionDataSource = new MatTableDataSource<Collection>();

  collectionCopyIds = new Set<number>();
  libraryItemIds = new Set<number>();
  private libraryItemsByCollection = new Map<number, LibraryItem>();
  libraryItemsLoaded = false;
  borrowedCopies = new Map<number, number>();


  displayedLogColumns: string[] = ['timestamp', 'user', 'action'];
  logDataSource = new MatTableDataSource<ChoirLog>();


  // Für die Mitglieder-Tabelle
  displayedColumns: string[] = ['name', 'email', 'address', 'role', 'status', 'actions'];
  dataSource = new MatTableDataSource<UserInChoir>();

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {
    this.choirForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      location: ['']
    });
  }

  ngOnInit(): void {
    const choirIdParam = this.route.snapshot.queryParamMap.get('choirId');
    this.adminChoirId = choirIdParam ? parseInt(choirIdParam, 10) : null;
    this.authService.isDirector$.pipe(take(1)).subscribe(isDirector => {
      this.isDirector = isDirector;
      this.updateCanManageMenu();
    });
    this.authService.isAdmin$.pipe(take(1)).subscribe(isAdmin => {
      this.isAdmin = isAdmin;
      this.updateCanManageMenu();
    });

    this.route.data.subscribe(data => {
      const pageData = data['pageData'];
      if (pageData) {
        // Füllen Sie das Formular und die Tabelle
        this.choirForm.patchValue(pageData.choirDetails);
        this.isChoirAdmin = pageData.isChoirAdmin;
        this.updateCanManageMenu();
        this.dienstplanEnabled = !!pageData.choirDetails.modules?.dienstplan;
        this.programsEnabled = !!pageData.choirDetails.modules?.programs;
        this.joinByLinkEnabled = !!pageData.choirDetails.modules?.joinByLink;
        const menu = pageData.choirDetails.modules?.singerMenu || {};
        this.menuOptions.forEach(opt => {
          this.singerMenu[opt.key] = menu[opt.key] !== false;
        });
        const rules = pageData.planRules as any[] || [];
        const sundayRule = rules.find(r => r.dayOfWeek === 0);
        if (sundayRule) {
          this.sundayRuleId = sundayRule.id;
          this.sundayWeeks = sundayRule.weeks && sundayRule.weeks.length ? sundayRule.weeks : [0];
        }
        const weekdayRule = rules.find(r => r.dayOfWeek === 3 || r.dayOfWeek === 4);
        if (weekdayRule) {
          this.weekdayRuleId = weekdayRule.id;
          this.weekdayDay = weekdayRule.dayOfWeek;
          this.weekdayWeeks = weekdayRule.weeks && weekdayRule.weeks.length ? weekdayRule.weeks : [0];
        }
        const choir = this.authService.activeChoir$.value;
        if (choir) {
          const updated = { ...choir, modules: pageData.choirDetails.modules } as Choir;
          this.authService.setActiveChoir(updated);
          this.authService.currentUser$.pipe(take(1)).subscribe(user => {
            if (user) {
              const updatedUser = { ...user, activeChoir: updated };
              this.authService.setCurrentUser(updatedUser);
            }
          });
        }
        if (pageData.choirDetails.joinHash) {
          this.joinLink = `${environment.baseUrl}/join/${pageData.choirDetails.joinHash}`;
        }
        if (!this.isChoirAdmin) {
          this.choirForm.disable();
        }
        this.dataSource.data = pageData.members;
        this.collectionDataSource.data = pageData.collections;
        this.logDataSource.data = pageData.logs;

        this.collectionCopyIds.clear();
        if (this.isChoirAdmin || this.isAdmin) {
          pageData.collections.forEach((col: Collection) => {
            this.apiService.getCollectionCopies(col.id).subscribe(copies => {
              if (copies.length > 0) {
                this.collectionCopyIds.add(col.id);
              }
            });
            this.libraryItemsLoaded = true;
          });
        } else {
          this.apiService.getMyBorrowings().subscribe(borrowings => {
            borrowings.forEach(b => {
              if (b.collectionId) {
                this.borrowedCopies.set(b.collectionId, b.copyNumber);
              }
            });
            this.libraryItemsLoaded = true;
          });
        }
      }
    });
  }

  private updateCanManageMenu(): void {
    this.canManageMenu = this.isChoirAdmin || this.isDirector || this.isAdmin;
  }

  private reloadData(): void {
    // Sie könnten einen API-Aufruf machen oder, noch besser, zur Seite neu navigieren,
    // um den Resolver erneut auszulösen.
    if (this.isChoirAdmin) {
      const opts = this.adminChoirId ? { choirId: this.adminChoirId } : undefined;
      this.apiService.getChoirMembers(opts).subscribe(members => {
        this.dataSource.data = members;
      });
      this.apiService.getChoirCollections(opts).subscribe(cols => {
        this.collectionDataSource.data = cols;
        this.collectionCopyIds.clear();
        cols.forEach(col => {
          this.apiService.getCollectionCopies(col.id).subscribe(copies => {
            if (copies.length > 0) {
              this.collectionCopyIds.add(col.id);
            }
          });
        });
      });
      this.apiService.getChoirLogs(opts).subscribe(logs => {
        this.logDataSource.data = logs;
      });
    }
  }

  toggleChoirInfo(): void {
    this.choirInfoExpanded = !this.choirInfoExpanded;
  }

  toggleChoirSetting(): void {
    this.choirSettingsExpanded = !this.choirSettingsExpanded;
  }

  toggleMembers(): void {
    this.membersExpanded = !this.membersExpanded;
  }

  copyEmailsToClipboard(): void {
    const emails = this.dataSource.data
      .map(u => u.email)
      .filter(email => !!email)
      .join(';');

    if (!emails) {
      this.snackBar.open('Keine E-Mailadressen vorhanden.', 'OK', { duration: 3000 });
      return;
    }

    navigator.clipboard.writeText(emails)
      .then(() => this.snackBar.open('E-Mailadressen kopiert.', 'OK', { duration: 3000 }))
      .catch(() => this.snackBar.open('Fehler beim Kopieren der E-Mailadressen.', 'Schließen'));
  }

  formatAction(log: ChoirLog): string {
    switch (log.action) {
      case 'member_join':
        return 'Beitritt';
      case 'member_leave':
        return 'Abmeldung';
      case 'repertoire_add_piece':
        return `Repertoire: Stück ${log.details?.pieceTitle || log.details?.pieceId} hinzugefügt`;
      case 'repertoire_update_status':
        return `Repertoire: Status geändert (${log.details?.pieceTitle || log.details?.pieceId})`;
      case 'repertoire_update_notes':
        return `Repertoire: Notizen geändert (${log.details?.pieceTitle || log.details?.pieceId})`;
      case 'repertoire_update_rating':
        return `Repertoire: Bewertung geändert (${log.details?.pieceTitle || log.details?.pieceId})`;
      case 'event_created':
        return `Termin erstellt (${log.details?.type})`;
      case 'event_updated':
        return `Termin geändert (${log.details?.type})`;
      case 'event_deleted':
        return 'Termin gelöscht';
      default:
        return log.action;
    }
  }

  onSaveChoirDetails(): void {
    if (this.choirForm.invalid) {
      return;
    }
    const opts = this.adminChoirId ? { choirId: this.adminChoirId } : undefined;
    this.apiService.updateMyChoir(this.choirForm.value, opts).subscribe({
      next: () => {
        this.snackBar.open('Choir details updated successfully!', 'OK', { duration: 3000 });
        this.choirForm.markAsPristine(); // Markiert das Formular als "unverändert"
      },
      error: (err) => this.snackBar.open('Fehler beim Aktualisieren der Chordaten.', 'Schließen')
    });
  }

  openInviteDialog(): void {
    if (!this.isChoirAdmin) {
      return;
    }
    const dialogRef = this.dialog.open(InviteUserDialogComponent, {
      width: '450px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.email && result.roles) {
        const opts = this.adminChoirId ? { choirId: this.adminChoirId } : undefined;
        this.apiService.inviteUserToChoir(result.email, result.roles, opts).subscribe({
          next: (response: { message: string }) => {
            this.snackBar.open(response.message, 'OK', { duration: 4000 });
            this.reloadData(); // Aktualisieren Sie die Datenquelle der Tabelle
          },
          error: (err) => this.snackBar.open(`Fehler beim Einladen: ${err.error.message}`, 'Schließen')
        });
      }
    });
  }

  removeMember(user: UserInChoir): void {
    if (!this.isChoirAdmin) {
      return;
    }
    const dialogData: ConfirmDialogData = {
      title: 'Mitglied entfernen?',
      message: `Soll ${user.name}, ${user.firstName} (${user.email}) aus diesem Chor entfernt werden? Dies kann nicht rückgängig gemacht werden.`
    };

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        const opts = this.adminChoirId ? { choirId: this.adminChoirId } : undefined;
        this.apiService.removeUserFromChoir(user.id, opts).subscribe({
          next: () => {
            this.snackBar.open(`${user.name}, ${user.firstName} wurde aus dem Chor entfernt.`, 'OK', { duration: 3000 });
            this.reloadData(); // Aktualisieren Sie die Datenquelle der Tabelle
          },
          error: (err) => this.snackBar.open('Fehler beim Entfernen des Mitglieds.', 'Schließen')
        });
      }
    });
  }


  onRolesChange(user: UserInChoir, roles: ('director' | 'choir_admin' | 'organist' | 'singer')[]): void {
    if (!this.isChoirAdmin) return;
    const previous = [...(user.membership?.rolesInChoir || [])];
    user.membership!.rolesInChoir = roles;
    const opts = this.adminChoirId ? { choirId: this.adminChoirId } : undefined;
    this.apiService.updateChoirMember(user.id, { rolesInChoir: roles }, opts).subscribe({
      error: () => {
        this.snackBar.open('Fehler beim Aktualisieren.', 'Schließen');
        user.membership!.rolesInChoir = previous;
      }
    });
  }


  onModulesChange(): void {
    if (!this.canManageMenu) {
      return;
    }

    const modules = { dienstplan: this.dienstplanEnabled, programs: this.programsEnabled, joinByLink: this.joinByLinkEnabled, singerMenu: this.singerMenu };
    const opts = this.adminChoirId ? { choirId: this.adminChoirId } : undefined;
    this.apiService.updateMyChoir({ modules }, opts).subscribe({
      next: () => {
        this.snackBar.open('Einstellungen aktualisiert.', 'OK', { duration: 3000 });
        const choir = this.authService.activeChoir$.value;
        if (choir) {
          const updated = { ...choir, modules } as Choir;
          this.authService.setActiveChoir(updated);
          this.authService.currentUser$.pipe(take(1)).subscribe(user => {
            if (user) {
              const updatedUser = { ...user, activeChoir: updated };
              this.authService.setCurrentUser(updatedUser);
            }
          });
        }
      },
      error: () => this.snackBar.open('Fehler beim Speichern der Einstellungen.', 'Schließen')
    });
  }

  saveServiceRules(): void {
    if (!this.isChoirAdmin) return;

    const sundayWeeks = (this.sundayWeeks.includes(0) || this.sundayWeeks.length === 0) ? null : this.sundayWeeks;
    const weekdayWeeks = (this.weekdayWeeks.includes(0) || this.weekdayWeeks.length === 0) ? null : this.weekdayWeeks;

    const ops = [] as Observable<any>[];

    if (this.sundayRuleId) {
      const opts = this.adminChoirId ? { choirId: this.adminChoirId } : undefined;
      ops.push(this.apiService.updatePlanRule(this.sundayRuleId, { dayOfWeek: 0, weeks: sundayWeeks }, opts));
    } else {
      const opts = this.adminChoirId ? { choirId: this.adminChoirId } : undefined;
      ops.push(this.apiService.createPlanRule({ dayOfWeek: 0, weeks: sundayWeeks }, opts));
    }

    if (this.weekdayDay !== null) {
      const data = { dayOfWeek: this.weekdayDay, weeks: weekdayWeeks };
      if (this.weekdayRuleId) {
        const opts = this.adminChoirId ? { choirId: this.adminChoirId } : undefined;
        ops.push(this.apiService.updatePlanRule(this.weekdayRuleId, data, opts));
      } else {
        const opts = this.adminChoirId ? { choirId: this.adminChoirId } : undefined;
        ops.push(this.apiService.createPlanRule(data, opts));
      }
    } else if (this.weekdayRuleId) {
      const opts = this.adminChoirId ? { choirId: this.adminChoirId } : undefined;
      ops.push(this.apiService.deletePlanRule(this.weekdayRuleId, opts));
    }

    forkJoin(ops).subscribe({
      next: () => this.snackBar.open('Einstellungen aktualisiert.', 'OK', { duration: 3000 }),
      error: () => this.snackBar.open('Fehler beim Speichern der Einstellungen.', 'Schließen')
    });
  }

  manageCopies(collection: Collection, event: Event): void {
    event.stopPropagation();

    if (!this.libraryItemsLoaded) {
      return;
    }
      if (this.collectionCopyIds.has(collection.id)) {
      this.dialog.open(CollectionCopiesDialogComponent, { data: { collectionId: collection.id } });

    } else {
      const copiesStr = prompt('Anzahl der Exemplare eingeben:');
      const copies = copiesStr ? parseInt(copiesStr, 10) : NaN;
      if (!isNaN(copies) && copies > 0) {
        this.apiService.initCollectionCopies(collection.id, copies).subscribe(() => {
          this.collectionCopyIds.add(collection.id);
          this.dialog.open(CollectionCopiesDialogComponent, { data: { collectionId: collection.id } });
        });
      }
    }
  }

  removeCollection(collection: Collection): void {
    if (!this.isChoirAdmin) {
      return;
    }
    const dialogData: ConfirmDialogData = {
      title: 'Sammlung entfernen?',
      message: `Soll die Sammlung '${collection.title}' aus dem Chor entfernt werden?`
    };

    const dialogRef = this.dialog.open(ConfirmDialogComponent, { data: dialogData });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        const opts = this.adminChoirId ? { choirId: this.adminChoirId } : undefined;
        this.apiService.removeCollectionFromChoir(collection.id, opts).subscribe({
          next: () => {
            this.snackBar.open(`'${collection.title}' entfernt.`, 'OK', { duration: 3000 });
            this.reloadData();
          },
          error: () => this.snackBar.open('Fehler beim Entfernen der Sammlung.', 'Schließen')
        });
      }
    });
  }

}
