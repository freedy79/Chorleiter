import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MaterialModule } from '@modules/material.module';
import { FormsModule } from '@angular/forms';
import { ApiService } from '@core/services/api.service';
import { Lending } from '@core/models/lending';
import { NotificationService } from '@core/services/notification.service';
import { UserInChoir } from '@core/models/user';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { ChoirDigitalLicense } from '@core/models/choir-digital-license';

@Component({
  selector: 'app-collection-copies-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MaterialModule, FormsModule],
  templateUrl: './collection-copies-dialog.component.html'
})
export class CollectionCopiesDialogComponent implements OnInit {
  copies: Lending[] = [];
  digitalLicenses: ChoirDigitalLicense[] = [];
  members: UserInChoir[] = [];
  displayedColumns = ['number', 'name', 'borrowed', 'returned', 'actions'];
  digitalDisplayedColumns = ['licenseNumber', 'licenseType', 'quantity', 'validity', 'document', 'actions'];
  licenseTypes: Array<ChoirDigitalLicense['licenseType']> = ['print', 'display', 'stream', 'archive'];
  newLicense: Partial<ChoirDigitalLicense> = {
    licenseNumber: '',
    licenseType: 'print',
    quantity: null,
    validFrom: null,
    validUntil: null,
    notes: null
  };

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { collectionId: number },
    private dialogRef: MatDialogRef<CollectionCopiesDialogComponent>,
    private api: ApiService,
    private notification: NotificationService
  ) {}

  ngOnInit(): void {
    this.load();
    this.api.getChoirMembers().subscribe(m => (this.members = m));
  }

  load(): void {
    this.api.getCollectionCopies(this.data.collectionId).subscribe(copies => (this.copies = copies));
    this.api.getCollectionDigitalLicenses(this.data.collectionId).subscribe(licenses => (this.digitalLicenses = licenses));
  }

  save(copy: Lending): void {
    const data: any = { borrowerName: copy.borrowerName };
    if (copy.borrowerId) data.borrowerId = copy.borrowerId;
    this.api.updateCollectionCopy(copy.id, data).subscribe(() => {
      this.notification.success('Gespeichert');
      this.load();
    });
  }

  fullName(u: UserInChoir): string {
    return u.firstName ? `${u.name}, ${u.firstName}` : u.name;
  }

  onNameSelected(copy: Lending, event: MatAutocompleteSelectedEvent): void {
    const value = event.option.value as string;
    const member = this.members.find(m => this.fullName(m) === value);
    copy.borrowerId = member?.id;
    copy.borrowerName = value;
    this.save(copy);
  }

  onNameBlur(copy: Lending): void {
    if (!copy.borrowerName) return;
    const member = this.members.find(m => this.fullName(m) === copy.borrowerName);
    copy.borrowerId = member?.id;
    this.save(copy);
  }

  returnCopy(copy: Lending): void {
    this.api.updateCollectionCopy(copy.id, { borrowerName: null, borrowerId: null }).subscribe(() => {
      this.notification.success('Gespeichert');
      this.load();
    });
  }

  print(): void {
    this.api.downloadCollectionCopiesPdf(this.data.collectionId).subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ausleihliste.pdf';
      a.click();
      window.URL.revokeObjectURL(url);
    });
  }

  adjustCopies(): void {
    const copiesStr = prompt('Neue Anzahl der Exemplare eingeben:');
    const copies = copiesStr ? parseInt(copiesStr, 10) : NaN;
    if (isNaN(copies) || copies < 1) {
      return;
    }
    if (copies < this.copies.length && this.copies.some(c => c.status === 'borrowed')) {
      this.notification.error('Reduzierung nicht möglich: Ausleihen vorhanden.');
      return;
    }
    this.api.setCollectionCopies(this.data.collectionId, copies).subscribe({
      next: () => {
        this.notification.success('Gespeichert');
        this.load();
      },
      error: err => {
        this.notification.error(err.error?.message || 'Fehler beim Speichern');
      }
    });
  }

  createDigitalLicense(): void {
    if (!this.newLicense.licenseNumber || !this.newLicense.licenseType) {
      this.notification.error('Lizenznummer und Lizenztyp sind erforderlich.');
      return;
    }

    this.api.createCollectionDigitalLicense(this.data.collectionId, this.newLicense).subscribe({
      next: () => {
        this.notification.success('Digitale Lizenz angelegt');
        this.newLicense = {
          licenseNumber: '',
          licenseType: 'print',
          quantity: null,
          validFrom: null,
          validUntil: null,
          notes: null
        };
        this.load();
      },
      error: () => this.notification.error('Fehler beim Anlegen der digitalen Lizenz')
    });
  }

  saveDigitalLicense(license: ChoirDigitalLicense): void {
    const payload: Partial<ChoirDigitalLicense> = {
      licenseNumber: license.licenseNumber,
      licenseType: license.licenseType,
      quantity: license.quantity ?? null,
      purchaseDate: license.purchaseDate ?? null,
      vendor: license.vendor ?? null,
      unitPrice: license.unitPrice ?? null,
      validFrom: license.validFrom ?? null,
      validUntil: license.validUntil ?? null,
      notes: license.notes ?? null
    };

    this.api.updateCollectionDigitalLicense(license.id, payload).subscribe({
      next: () => {
        this.notification.success('Digitale Lizenz gespeichert');
        this.load();
      },
      error: () => this.notification.error('Fehler beim Speichern der digitalen Lizenz')
    });
  }

  deleteDigitalLicense(license: ChoirDigitalLicense): void {
    this.api.deleteCollectionDigitalLicense(license.id).subscribe({
      next: () => {
        this.notification.success('Digitale Lizenz gelöscht');
        this.load();
      },
      error: () => this.notification.error('Fehler beim Löschen der digitalen Lizenz')
    });
  }

  uploadLicenseFile(license: ChoirDigitalLicense, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.api.uploadCollectionDigitalLicenseDocument(license.id, file).subscribe({
      next: () => {
        this.notification.success('Lizenz-PDF hochgeladen');
        this.load();
      },
      error: () => this.notification.error('Fehler beim Upload der Lizenzdatei')
    });

    input.value = '';
  }

  downloadLicenseFile(license: ChoirDigitalLicense): void {
    this.api.downloadCollectionDigitalLicenseDocument(license.id).subscribe({
      next: blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = license.documentOriginalName || `lizenz-${license.id}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => this.notification.error('Fehler beim Download der Lizenzdatei')
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
