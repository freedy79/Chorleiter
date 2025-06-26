import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';

import { ApiService } from 'src/app/core/services/api.service';
import { Piece } from 'src/app/core/models/piece';

import { MaterialModule } from '@modules/material.module';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatChipsModule } from '@angular/material/chips';
import { LookupPiece } from '@core/models/lookup-piece';


@Component({
  selector: 'app-event-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MaterialModule,
    MatDatepickerModule,
    MatAutocompleteModule,
    MatChipsModule
  ],
  providers: [
    MatDatepickerModule,
    MatNativeDateModule
  ],
  templateUrl: './event-dialog.component.html',
  styleUrls: ['./event-dialog.component.scss']
})
export class EventDialogComponent implements OnInit {
  eventForm: FormGroup;
  pieceCtrl = new FormControl<string | LookupPiece>(''); // Verwenden Sie das neue Interface
  filteredPieces$!: Observable<LookupPiece[]>;
  allRepertoirePieces: LookupPiece[] = [];
  selectedPieces: LookupPiece[] = [];

  @ViewChild('pieceInput') pieceInput!: ElementRef<HTMLInputElement>;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    public dialogRef: MatDialogRef<EventDialogComponent>
  ) {
    this.eventForm = this.fb.group({
      date: [new Date(), Validators.required],
      type: ['', Validators.required],
      notes: ['']
    });
  }

  ngOnInit(): void {
    // Holen Sie das gesamte Repertoire des Chors
    this.apiService.getRepertoireForLookup().subscribe(pieces => {
      this.allRepertoirePieces = pieces;
      // Die Daten sind bereits perfekt formatiert, keine weitere Verarbeitung nötig!
      this.initializeAutocomplete();
    });
  }

  private formatReference(piece: Piece): string | undefined {
    // This function will likely not work anymore since the lookup endpoint doesn't
    // return collection data. We should adjust the filter and display accordingly.
    // Let's simplify for now.
    return undefined;
  }

  private initializeAutocomplete(): void {
    this.filteredPieces$ = this.pieceCtrl.valueChanges.pipe(
      startWith(''),
      map(value => {
        const searchString = typeof value === 'string' ? value : value?.title;
        return searchString ? this._filter(searchString) : this.allRepertoirePieces.slice();
      })
    );
  }

  // --- DIE ERWEITERTE FILTERFUNKTION ---
  private _filter(search: string): LookupPiece[] {
    const filterValue = search.toLowerCase().replace(/\s/g, '');
    const selectedIds = new Set(this.selectedPieces.map(p => p.id));

    return this.allRepertoirePieces.filter(piece => {
      const isNotSelected = !selectedIds.has(piece.id);

      // Prüfen, ob der Titel ODER die Referenz passt.
      const titleMatches = piece.title.toLowerCase().includes(filterValue);
      // 'piece.reference' ist jetzt ein einfacher String.
      const referenceMatches = piece.reference ? piece.reference.toLowerCase().replace(/\s/g, '').includes(filterValue) : false;

      return isNotSelected && (titleMatches || referenceMatches);
    });
  }

  // Helper, um den Titel im Input-Feld anzuzeigen
  displayPiece(piece: LookupPiece): string {
    return piece && piece.title ? piece.title : '';
  }

  // Wird aufgerufen, wenn ein Stück aus der Liste ausgewählt wird
  selected(event: MatAutocompleteSelectedEvent): void {
    const pieceToAdd = event.option.value as LookupPiece;
    if (pieceToAdd) {
      this.selectedPieces.push(pieceToAdd);
    }
    this.pieceInput.nativeElement.value = '';
    this.pieceCtrl.setValue('');
  }

  // Wird aufgerufen, wenn ein Chip entfernt wird
  remove(piece: LookupPiece): void {
    const index = this.selectedPieces.indexOf(piece);
    if (index >= 0) {
      this.selectedPieces.splice(index, 1);
    }
    // Triggern Sie die Neubewertung der Autocomplete-Liste
    this.pieceCtrl.updateValueAndValidity();
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.eventForm.valid) {
      const formValue = this.eventForm.value;
       const payload = {
        ...this.eventForm.value,
        pieceIds: this.selectedPieces.map(p => p.id) // Senden Sie nur die IDs
      };
      this.dialogRef.close(payload);
    }
  }
}
