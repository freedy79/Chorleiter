import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import {
  ClassicEditor, Essentials, Paragraph, Bold, Italic, Underline, Strikethrough,
  Link, List, Heading, BlockQuote, Alignment, HorizontalLine, Indent,
  EditorConfig
} from 'ckeditor5';
import { AdminService } from '@core/services/admin.service';
import { NotificationService } from '@core/services/notification.service';

@Component({
  selector: 'app-privacy-settings',
  standalone: true,
  imports: [CommonModule, MaterialModule, CKEditorModule],
  templateUrl: './privacy-settings.component.html',
  styleUrls: ['./privacy-settings.component.scss']
})
export class PrivacySettingsComponent implements OnInit {
  public Editor = ClassicEditor;
  public editorConfig: EditorConfig = {
    plugins: [
      Essentials, Paragraph, Bold, Italic, Underline, Strikethrough,
      Link, List, Heading, BlockQuote, Alignment, HorizontalLine, Indent
    ],
    toolbar: [
      'heading', '|',
      'bold', 'italic', 'underline', 'strikethrough', '|',
      'alignment', '|',
      'bulletedList', 'numberedList', '|',
      'outdent', 'indent', '|',
      'blockQuote', 'horizontalLine', '|',
      'link', '|',
      'undo', 'redo'
    ],
    heading: {
      options: [
        { model: 'paragraph', title: 'Absatz', class: 'ck-heading_paragraph' },
        { model: 'heading1', view: 'h1', title: 'Überschrift 1', class: 'ck-heading_heading1' },
        { model: 'heading2', view: 'h2', title: 'Überschrift 2', class: 'ck-heading_heading2' },
        { model: 'heading3', view: 'h3', title: 'Überschrift 3', class: 'ck-heading_heading3' },
        { model: 'heading4', view: 'h4', title: 'Überschrift 4', class: 'ck-heading_heading4' }
      ]
    },
    licenseKey: 'GPL'
  };

  html: string = '';
  loading = true;
  saving = false;
  saved = false;
  dirty = false;
  error: string | null = null;

  constructor(
    private adminService: AdminService,
    private notification: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadPolicy();
  }

  loadPolicy(): void {
    this.loading = true;
    this.error = null;

    this.adminService.getPrivacyPolicy().subscribe({
      next: (data: { html: string }) => {
        this.html = data.html || '';
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error loading privacy policy:', err);
        this.error = 'Fehler beim Laden der Datenschutzerklärung.';
        this.loading = false;
      }
    });
  }

  onEditorChange(event: any): void {
    this.html = event.editor.getData();
    this.dirty = true;
    this.saved = false;
  }

  save(): void {
    this.saving = true;
    this.error = null;
    this.saved = false;

    this.adminService.updatePrivacyPolicy({ html: this.html }).subscribe({
      next: () => {
        this.saving = false;
        this.saved = true;
        this.dirty = false;
        this.notification.success('Datenschutzerklärung gespeichert', 2000);

        setTimeout(() => {
          this.saved = false;
        }, 3000);
      },
      error: (err: any) => {
        this.saving = false;
        console.error('Error saving privacy policy:', err);
        this.error = err.error?.message || 'Fehler beim Speichern der Datenschutzerklärung.';
        this.notification.error('Fehler beim Speichern');
      }
    });
  }
}
