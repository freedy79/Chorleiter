import { Component, OnInit, HostListener, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MailTemplate } from '@core/models/mail-template';
import { PendingChanges } from '@core/guards/pending-changes.guard';

declare var Quill: any;

@Component({
  selector: 'app-mail-templates',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './mail-templates.component.html',
  styleUrls: ['./mail-templates.component.scss']
})
export class MailTemplatesComponent implements OnInit, AfterViewInit, PendingChanges {
  form!: FormGroup;
  @ViewChild('inviteEditor') inviteEditor!: ElementRef<HTMLDivElement>;
  @ViewChild('resetEditor') resetEditor!: ElementRef<HTMLDivElement>;
  @ViewChild('availabilityEditor') availabilityEditor!: ElementRef<HTMLDivElement>;
  @ViewChild('changeEditor') changeEditor!: ElementRef<HTMLDivElement>;
  @ViewChild('monthlyEditor') monthlyEditor!: ElementRef<HTMLDivElement>;
  private inviteQuill: any;
  private resetQuill: any;
  private availabilityQuill: any;
  private changeQuill: any;
  private monthlyQuill: any;
  inviteHtmlMode = false;
  resetHtmlMode = false;
  availabilityHtmlMode = false;
  changeHtmlMode = false;
  monthlyHtmlMode = false;
  private initializing = true;

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
      monthlyBody: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.load();
  }

  ngAfterViewInit(): void {
    this.initEditors();
    this.setEditorContents();
    setTimeout(() => {
      this.form.markAsPristine();
      this.initializing = false;
    });
  }

  load(): void {
    this.api.getMailTemplates().subscribe(templates => {
      const invite = templates.find(t => t.type === 'invite');
      const reset = templates.find(t => t.type === 'reset');
      const avail = templates.find(t => t.type === 'availability-request');
      const change = templates.find(t => t.type === 'piece-change');
      const monthly = templates.find(t => t.type === 'monthly-plan');
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
      this.form.markAsPristine();
      this.setEditorContents();
    });
  }

  save(type?: string): void {
    if (this.form.invalid) return;
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
    this.api.updateMailTemplates(templates).subscribe(() => {
      this.snack.open('Gespeichert', 'OK', { duration: 2000 });
      this.form.markAsPristine();
    });
  }

  private initEditors(): void {
    const options = {
      theme: 'snow',
      modules: {
        toolbar: [
          ['bold', 'italic', 'underline'],
          [{ color: [] }, { background: [] }],
          ['link', 'clean']
        ]
      }
    };
    if ((window as any).Quill && this.inviteEditor && !this.inviteQuill) {
      this.inviteQuill = new (window as any).Quill(this.inviteEditor.nativeElement, options);
      this.inviteQuill.on('text-change', (_: any, __: any, source: string) => {
        this.form.patchValue({ inviteBody: this.inviteQuill.root.innerHTML }, { emitEvent: false });
        if (!this.initializing && source === 'user') {
          this.form.get('inviteBody')?.markAsDirty();
        }
      });
    }
    if ((window as any).Quill && this.resetEditor && !this.resetQuill) {
      this.resetQuill = new (window as any).Quill(this.resetEditor.nativeElement, options);
      this.resetQuill.on('text-change', (_: any, __: any, source: string) => {
        this.form.patchValue({ resetBody: this.resetQuill.root.innerHTML }, { emitEvent: false });
        if (!this.initializing && source === 'user') {
          this.form.get('resetBody')?.markAsDirty();
        }
      });
    }
    if ((window as any).Quill && this.availabilityEditor && !this.availabilityQuill) {
      this.availabilityQuill = new (window as any).Quill(this.availabilityEditor.nativeElement, options);
      this.availabilityQuill.on('text-change', (_: any, __: any, source: string) => {
        this.form.patchValue({ availabilityBody: this.availabilityQuill.root.innerHTML }, { emitEvent: false });
        if (!this.initializing && source === 'user') {
          this.form.get('availabilityBody')?.markAsDirty();
        }
      });
    }
    if ((window as any).Quill && this.changeEditor && !this.changeQuill) {
      this.changeQuill = new (window as any).Quill(this.changeEditor.nativeElement, options);
      this.changeQuill.on('text-change', (_: any, __: any, source: string) => {
        this.form.patchValue({ changeBody: this.changeQuill.root.innerHTML }, { emitEvent: false });
        if (!this.initializing && source === 'user') {
          this.form.get('changeBody')?.markAsDirty();
        }
      });
    }
    if ((window as any).Quill && this.monthlyEditor && !this.monthlyQuill) {
      this.monthlyQuill = new (window as any).Quill(this.monthlyEditor.nativeElement, options);
      this.monthlyQuill.on('text-change', (_: any, __: any, source: string) => {
        this.form.patchValue({ monthlyBody: this.monthlyQuill.root.innerHTML }, { emitEvent: false });
        if (!this.initializing && source === 'user') {
          this.form.get('monthlyBody')?.markAsDirty();
        }
      });
    }
  }

  private setEditorContents(): void {
    if (this.inviteQuill) {
      this.inviteQuill.root.innerHTML = this.form.value.inviteBody || '';
    }
    if (this.resetQuill) {
      this.resetQuill.root.innerHTML = this.form.value.resetBody || '';
    }
    if (this.availabilityQuill) {
      this.availabilityQuill.root.innerHTML = this.form.value.availabilityBody || '';
    }
    if (this.changeQuill) {
      this.changeQuill.root.innerHTML = this.form.value.changeBody || '';
    }
    if (this.monthlyQuill) {
      this.monthlyQuill.root.innerHTML = this.form.value.monthlyBody || '';
    }
  }

  toggleInviteHtml(): void {
    this.inviteHtmlMode = !this.inviteHtmlMode;
    if (this.inviteHtmlMode && this.inviteQuill) {
      this.form.patchValue({ inviteBody: this.inviteQuill.root.innerHTML });
    }
    if (!this.inviteHtmlMode && this.inviteQuill) {
      this.inviteQuill.root.innerHTML = this.form.value.inviteBody || '';
    }
  }

  toggleResetHtml(): void {
    this.resetHtmlMode = !this.resetHtmlMode;
    if (this.resetHtmlMode && this.resetQuill) {
      this.form.patchValue({ resetBody: this.resetQuill.root.innerHTML });
    }
    if (!this.resetHtmlMode && this.resetQuill) {
      this.resetQuill.root.innerHTML = this.form.value.resetBody || '';
    }
  }

  toggleAvailabilityHtml(): void {
    this.availabilityHtmlMode = !this.availabilityHtmlMode;
    if (this.availabilityHtmlMode && this.availabilityQuill) {
      this.form.patchValue({ availabilityBody: this.availabilityQuill.root.innerHTML });
    }
    if (!this.availabilityHtmlMode && this.availabilityQuill) {
      this.availabilityQuill.root.innerHTML = this.form.value.availabilityBody || '';
    }
  }

  toggleChangeHtml(): void {
    this.changeHtmlMode = !this.changeHtmlMode;
    if (this.changeHtmlMode && this.changeQuill) {
      this.form.patchValue({ changeBody: this.changeQuill.root.innerHTML });
    }
    if (!this.changeHtmlMode && this.changeQuill) {
      this.changeQuill.root.innerHTML = this.form.value.changeBody || '';
    }
  }

  toggleMonthlyHtml(): void {
    this.monthlyHtmlMode = !this.monthlyHtmlMode;
    if (this.monthlyHtmlMode && this.monthlyQuill) {
      this.form.patchValue({ monthlyBody: this.monthlyQuill.root.innerHTML });
    }
    if (!this.monthlyHtmlMode && this.monthlyQuill) {
      this.monthlyQuill.root.innerHTML = this.form.value.monthlyBody || '';
    }
  }

  sendTest(type: string): void {
    this.api.sendTemplateTest(type).subscribe(() => {
      this.snack.open('Testmail verschickt', 'OK', { duration: 2000 });
    });
  }

  hasPendingChanges(): boolean {
    return this.form.dirty;
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
