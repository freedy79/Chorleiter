import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MailTemplate } from '@core/models/mail-template';
import { PendingChanges } from '@core/guards/pending-changes.guard';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';

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
  public Editor = ClassicEditor as any;
  public editorConfig: any = {
    toolbar: ['bold', 'italic', 'underline', 'link', 'undo', 'redo']
  };

  constructor(private fb: FormBuilder, private api: ApiService, private snack: MatSnackBar) {
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
      emailChangeBody: ['', Validators.required]
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
    this.api.updateMailTemplates(templates).subscribe(() => {
      this.snack.open('Gespeichert', 'OK', { duration: 2000 });
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

  sendTest(type: string): void {
    this.api.sendTemplateTest(type).subscribe(() => {
      this.snack.open('Testmail verschickt', 'OK', { duration: 2000 });
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
