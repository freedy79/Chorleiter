import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { MaterialModule } from '@modules/material.module';
import { UserInChoir } from '@core/models/user';

export interface ChatRoomDialogData {
  mode: 'create' | 'edit';
  choirMembers: UserInChoir[];
  room?: {
    id: number;
    title: string;
    isPrivate: boolean;
    isDefault: boolean;
    memberUserIds: number[];
  };
}

export interface ChatRoomDialogResult {
  title: string;
  isPrivate: boolean;
  memberUserIds: number[];
}

@Component({
  selector: 'app-chat-room-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule],
  templateUrl: './chat-room-dialog.component.html',
  styleUrls: ['./chat-room-dialog.component.scss']
})
export class ChatRoomDialogComponent {
  title = '';
  isPrivate = false;
  memberUserIds: number[] = [];
  validationMessage = '';

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ChatRoomDialogData,
    private dialogRef: MatDialogRef<ChatRoomDialogComponent, ChatRoomDialogResult>
  ) {
    this.title = (data.room?.title || '').trim();
    this.isPrivate = !!data.room?.isPrivate;
    this.memberUserIds = [...(data.room?.memberUserIds || [])];
  }

  get isEditMode(): boolean {
    return this.data.mode === 'edit';
  }

  get dialogTitle(): string {
    return this.isEditMode ? 'Raum bearbeiten' : 'Neuen Raum erstellen';
  }

  get submitLabel(): string {
    return this.isEditMode ? 'Speichern' : 'Raum erstellen';
  }

  get canChangePrivacy(): boolean {
    return !(this.isEditMode && this.data.room?.isDefault);
  }

  save(): void {
    this.validationMessage = '';

    const title = this.title.trim();
    if (title.length < 2) {
      this.validationMessage = 'Bitte einen Raumnamen mit mindestens 2 Zeichen angeben.';
      return;
    }

    const normalizedMemberIds = Array.from(
      new Set((this.memberUserIds || []).map(id => Number(id)).filter(id => Number.isInteger(id) && id > 0))
    );

    const effectiveIsPrivate = this.canChangePrivacy ? this.isPrivate : false;
    if (effectiveIsPrivate && normalizedMemberIds.length === 0) {
      this.validationMessage = 'Private Räume benötigen mindestens eine ausgewählte Person.';
      return;
    }

    this.dialogRef.close({
      title,
      isPrivate: effectiveIsPrivate,
      memberUserIds: normalizedMemberIds
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
