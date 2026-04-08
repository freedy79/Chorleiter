import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import {
  ClassicEditor, Essentials, Paragraph, Bold, Italic, Underline, Strikethrough,
  Link, List, Heading, BlockQuote, Alignment, HorizontalLine, Indent,
  EditorConfig
} from 'ckeditor5';
import { RichTextBlock } from '../block.model';

@Component({
  selector: 'app-rich-text-block-editor',
  standalone: true,
  imports: [CommonModule, CKEditorModule],
  template: `
    <div class="rich-text-editor">
      <ckeditor
        [editor]="Editor"
        [config]="editorConfig"
        [data]="block.html"
        (change)="onEditorChange($event)">
      </ckeditor>
    </div>
  `,
  styles: [`
    .rich-text-editor {
      :host ::ng-deep .ck-editor__editable {
        min-height: 120px;
      }
    }
  `]
})
export class RichTextBlockEditorComponent {
  @Input() block!: RichTextBlock;
  @Output() blockChange = new EventEmitter<RichTextBlock>();

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
        { model: 'heading2', view: 'h2', title: 'Überschrift 2', class: 'ck-heading_heading2' },
        { model: 'heading3', view: 'h3', title: 'Überschrift 3', class: 'ck-heading_heading3' },
        { model: 'heading4', view: 'h4', title: 'Überschrift 4', class: 'ck-heading_heading4' }
      ]
    },
    licenseKey: 'GPL'
  };

  onEditorChange(event: any): void {
    const data = event.editor.getData();
    this.blockChange.emit({ ...this.block, html: data });
  }
}
