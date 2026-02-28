import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { NotificationService } from '@core/services/notification.service';
import { MailTemplate } from '@core/models/mail-template';
import { PendingChanges } from '@core/guards/pending-changes.guard';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import { ClassicEditor, Essentials, Paragraph, Bold, Italic, Underline, Link } from 'ckeditor5';

@Component({
  selector: 'app-mail-templates',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule, CKEditorModule],
  templateUrl: './mail-templates.component.html',
  styleUrls: ['./mail-templates.component.scss']
})
export class MailTemplatesComponent implements OnInit, PendingChanges {
  form!: FormGroup;
  inviteHtmlMode = false;
  resetHtmlMode = false;
  availabilityHtmlMode = false;
  changeHtmlMode = false;
  monthlyHtmlMode = false;
  emailChangeHtmlMode = false;
  lendingBorrowedHtmlMode = false;
  lendingReturnedHtmlMode = false;
  footerHtmlMode = false;
  public Editor = ClassicEditor;
  public editorConfig = {
    plugins: [Essentials, Paragraph, Bold, Italic, Underline, Link],
    toolbar: ['bold', 'italic', 'underline', 'link', 'undo', 'redo']
  };

  constructor(private fb: FormBuilder, private api: ApiService, private notification: NotificationService) {
    this.form = this.fb.group({
      inviteSubject: ['', Validators.required],
      inviteBody: ['', Validators.required],
      resetSubject: ['', Validators.required],
      resetBody: ['', Validators.required],
      availabilitySubject: ['', Validators.required],
      availabilityBody: ['', Validators.required],
      changeSubject: ['', Validators.required],
      changeBody: ['', Validators.required],
      monthlySubject: ['', Validators.required],
      monthlyBody: ['', Validators.required],
      emailChangeSubject: ['', Validators.required],
      emailChangeBody: ['', Validators.required],
      lendingBorrowedSubject: ['', Validators.required],
      lendingBorrowedBody: ['', Validators.required],
      lendingReturnedSubject: ['', Validators.required],
      lendingReturnedBody: ['', Validators.required],
      footerBody: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.load();
    setTimeout(() => this.form.markAsPristine());
  }

  load(): void {
    this.api.getMailTemplates().subscribe(templates => {
      const invite = templates.find(t => t.type === 'invite');
      const reset = templates.find(t => t.type === 'reset');
      const avail = templates.find(t => t.type === 'availability-request');
      const change = templates.find(t => t.type === 'piece-change');
      const monthly = templates.find(t => t.type === 'monthly-plan');
      const emailChange = templates.find(t => t.type === 'email-change');
      const lendingBorrowed = templates.find(t => t.type === 'lending-borrowed');
      const lendingReturned = templates.find(t => t.type === 'lending-returned');
      const footer = templates.find(t => t.type === 'mail-footer');
      if (invite) {
        this.form.patchValue({ inviteSubject: invite.subject, inviteBody: invite.body });
      }
      if (reset) {
        this.form.patchValue({ resetSubject: reset.subject, resetBody: reset.body });
      }
      if (avail) {
        this.form.patchValue({ availabilitySubject: avail.subject, availabilityBody: avail.body });
      }
      if (change) {
        this.form.patchValue({ changeSubject: change.subject, changeBody: change.body });
      }
      if (monthly) {
        this.form.patchValue({ monthlySubject: monthly.subject, monthlyBody: monthly.body });
      }
      if (emailChange) {
        this.form.patchValue({ emailChangeSubject: emailChange.subject, emailChangeBody: emailChange.body });
      }
      if (lendingBorrowed) {
        this.form.patchValue({ lendingBorrowedSubject: lendingBorrowed.subject, lendingBorrowedBody: lendingBorrowed.body });
      }
      if (lendingReturned) {
        this.form.patchValue({ lendingReturnedSubject: lendingReturned.subject, lendingReturnedBody: lendingReturned.body });
      }
      if (footer) {
        this.form.patchValue({ footerBody: footer.body });
      }
      this.form.markAsPristine();
    });
  }

  save(type?: string): void {
    const controls = this.getControlsForType(type);
    controls.forEach(control => this.form.get(control)?.markAsTouched());
    if (controls.some(control => this.form.get(control)?.invalid)) return;
    const templates: MailTemplate[] = [];
    const value = this.form.value;
    if (!type || type === 'invite') {
      templates.push({ type: 'invite', subject: value.inviteSubject, body: value.inviteBody });
    }
    if (!type || type === 'reset') {
      templates.push({ type: 'reset', subject: value.resetSubject, body: value.resetBody });
    }
    if (!type || type === 'availability-request') {
      templates.push({ type: 'availability-request', subject: value.availabilitySubject, body: value.availabilityBody });
    }
    if (!type || type === 'piece-change') {
      templates.push({ type: 'piece-change', subject: value.changeSubject, body: value.changeBody });
    }
    if (!type || type === 'monthly-plan') {
      templates.push({ type: 'monthly-plan', subject: value.monthlySubject, body: value.monthlyBody });
    }
    if (!type || type === 'email-change') {
      templates.push({ type: 'email-change', subject: value.emailChangeSubject, body: value.emailChangeBody });
    }
    if (!type || type === 'lending-borrowed') {
      templates.push({ type: 'lending-borrowed', subject: value.lendingBorrowedSubject, body: value.lendingBorrowedBody });
    }
    if (!type || type === 'lending-returned') {
      templates.push({ type: 'lending-returned', subject: value.lendingReturnedSubject, body: value.lendingReturnedBody });
    }
    if (!type || type === 'mail-footer') {
      templates.push({ type: 'mail-footer', subject: '(Footer)', body: value.footerBody });
    }
    this.api.updateMailTemplates(templates).subscribe(() => {
      this.notification.success('Gespeichert');
      controls.forEach(control => this.form.get(control)?.markAsPristine());
    });
  }

  toggleInviteHtml(): void {
    this.inviteHtmlMode = !this.inviteHtmlMode;
  }

  toggleResetHtml(): void {
    this.resetHtmlMode = !this.resetHtmlMode;
  }

  toggleAvailabilityHtml(): void {
    this.availabilityHtmlMode = !this.availabilityHtmlMode;
  }

  toggleChangeHtml(): void {
    this.changeHtmlMode = !this.changeHtmlMode;
  }

  toggleMonthlyHtml(): void {
    this.monthlyHtmlMode = !this.monthlyHtmlMode;
  }

  toggleEmailChangeHtml(): void {
    this.emailChangeHtmlMode = !this.emailChangeHtmlMode;
  }

  toggleLendingBorrowedHtml(): void {
    this.lendingBorrowedHtmlMode = !this.lendingBorrowedHtmlMode;
  }

  toggleLendingReturnedHtml(): void {
    this.lendingReturnedHtmlMode = !this.lendingReturnedHtmlMode;
  }

  toggleFooterHtml(): void {
    this.footerHtmlMode = !this.footerHtmlMode;
  }

  sendTest(type: string): void {
    this.api.sendTemplateTest(type).subscribe(() => {
      this.notification.success('Testmail verschickt');
    });
  }

  hasPendingChanges(): boolean {
    return this.form.dirty;
  }

  private getControlsForType(type?: string): string[] {
    switch (type) {
      case 'invite':
        return ['inviteSubject', 'inviteBody'];
      case 'reset':
        return ['resetSubject', 'resetBody'];
      case 'availability-request':
        return ['availabilitySubject', 'availabilityBody'];
      case 'piece-change':
        return ['changeSubject', 'changeBody'];
      case 'monthly-plan':
        return ['monthlySubject', 'monthlyBody'];
      case 'email-change':
        return ['emailChangeSubject', 'emailChangeBody'];
      case 'lending-borrowed':
        return ['lendingBorrowedSubject', 'lendingBorrowedBody'];
      case 'lending-returned':
        return ['lendingReturnedSubject', 'lendingReturnedBody'];
      case 'mail-footer':
        return ['footerBody'];
      default:
        return Object.keys(this.form.controls);
    }
  }

  getChangedFields(): string[] {
    return Object.keys(this.form.controls).filter(key => this.form.get(key)?.dirty);
  }

  @HostListener('window:beforeunload', ['$event'])
  confirmUnload(event: BeforeUnloadEvent): void {
    if (this.hasPendingChanges()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
