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
  private inviteQuill: any;
  private resetQuill: any;

  constructor(private fb: FormBuilder, private api: ApiService, private snack: MatSnackBar) {
    this.form = this.fb.group({
      inviteSubject: ['', Validators.required],
      inviteBody: ['', Validators.required],
      resetSubject: ['', Validators.required],
      resetBody: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.load();
  }

  ngAfterViewInit(): void {
    this.initEditors();
    this.setEditorContents();
  }

  load(): void {
    this.api.getMailTemplates().subscribe(templates => {
      const invite = templates.find(t => t.type === 'invite');
      const reset = templates.find(t => t.type === 'reset');
      if (invite) {
        this.form.patchValue({ inviteSubject: invite.subject, inviteBody: invite.body });
      }
      if (reset) {
        this.form.patchValue({ resetSubject: reset.subject, resetBody: reset.body });
      }
      this.form.markAsPristine();
      this.setEditorContents();
    });
  }

  save(): void {
    if (this.form.invalid) return;
    const templates: MailTemplate[] = [
      { type: 'invite', subject: this.form.value.inviteSubject, body: this.form.value.inviteBody },
      { type: 'reset', subject: this.form.value.resetSubject, body: this.form.value.resetBody }
    ];
    this.api.updateMailTemplates(templates).subscribe(() => {
      this.snack.open('Gespeichert', 'OK', { duration: 2000 });
      this.form.markAsPristine();
    });
  }

  private initEditors(): void {
    if ((window as any).Quill && this.inviteEditor && !this.inviteQuill) {
      this.inviteQuill = new (window as any).Quill(this.inviteEditor.nativeElement, { theme: 'snow' });
      this.inviteQuill.on('text-change', () => {
        this.form.patchValue({ inviteBody: this.inviteQuill.root.innerHTML });
        this.form.get('inviteBody')?.markAsDirty();
      });
    }
    if ((window as any).Quill && this.resetEditor && !this.resetQuill) {
      this.resetQuill = new (window as any).Quill(this.resetEditor.nativeElement, { theme: 'snow' });
      this.resetQuill.on('text-change', () => {
        this.form.patchValue({ resetBody: this.resetQuill.root.innerHTML });
        this.form.get('resetBody')?.markAsDirty();
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
  }

  sendTest(type: string): void {
    this.api.sendTemplateTest(type).subscribe(() => {
      this.snack.open('Testmail verschickt', 'OK', { duration: 2000 });
    });
  }

  hasPendingChanges(): boolean {
    return this.form.dirty;
  }

  @HostListener('window:beforeunload', ['$event'])
  confirmUnload(event: BeforeUnloadEvent): void {
    if (this.hasPendingChanges()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
