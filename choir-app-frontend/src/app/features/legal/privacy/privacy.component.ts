import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MaterialModule } from '@modules/material.module';
import { environment } from 'src/environments/environment';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import DOMPurify from 'dompurify';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './privacy.component.html',
  styleUrls: ['./privacy.component.scss'],
  host: {
    'style': 'display: flex; flex-direction: column; flex: 1; width: 100%; min-height: 100vh;'
  }
})
export class PrivacyComponent implements OnInit {
  loading = true;
  customHtml: SafeHtml | null = null;
  hasCustomContent = false;

  constructor(private http: HttpClient, private sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    this.http.get<{ html: string }>(`${environment.apiUrl}/privacy`).subscribe({
      next: (data) => {
        if (data.html && data.html.trim()) {
          const sanitized = DOMPurify.sanitize(data.html, {
            USE_PROFILES: { html: true },
            FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
            FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onsubmit'],
          });
          this.customHtml = this.sanitizer.bypassSecurityTrustHtml(sanitized);
          this.hasCustomContent = true;
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}
