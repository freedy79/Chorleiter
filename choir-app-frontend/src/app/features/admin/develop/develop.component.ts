import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from '@modules/material.module';
import { DebugLogService } from '@core/services/debug-log.service';
import { environment } from '@env/environment';

interface PaletteColor {
  name: string;
  hex: string;
  scss: string;
}

@Component({
  selector: 'app-develop',
  standalone: true,
  imports: [CommonModule, MaterialModule, FormsModule],
  templateUrl: './develop.component.html',
  styleUrls: ['./develop.component.scss']
})
export class DevelopComponent implements OnInit {
  primaryColors: PaletteColor[] = [];
  accentColors: PaletteColor[] = [];
  debugLogs = false;

  constructor(private logger: DebugLogService) {}

  ngOnInit(): void {
    this.debugLogs = this.logger.isEnabled();
    this.primaryColors = [
      { name: '50', hex: '#e0f1fa', scss: 'mat.m2-get-color-from-palette(nak.$choir-app-primary, 50)' },
      { name: '100', hex: '#b3dff4', scss: 'mat.m2-get-color-from-palette(nak.$choir-app-primary, 100)' },
      { name: '200', hex: '#80caf0', scss: 'mat.m2-get-color-from-palette(nak.$choir-app-primary, 200)' },
      { name: '300', hex: '#4db4eb', scss: 'mat.m2-get-color-from-palette(nak.$choir-app-primary, 300)' },
      { name: '400', hex: '#26a4e7', scss: 'mat.m2-get-color-from-palette(nak.$choir-app-primary, 400)' },
      { name: '500', hex: '#0093e4', scss: 'mat.m2-get-color-from-palette(nak.$choir-app-primary, 500)' },
      { name: '600', hex: '#008be2', scss: 'mat.m2-get-color-from-palette(nak.$choir-app-primary, 600)' },
      { name: '700', hex: '#007fde', scss: 'mat.m2-get-color-from-palette(nak.$choir-app-primary, 700)' },
      { name: '800', hex: '#0074da', scss: 'mat.m2-get-color-from-palette(nak.$choir-app-primary, 800)' },
      { name: '900', hex: '#0060d2', scss: 'mat.m2-get-color-from-palette(nak.$choir-app-primary, 900)' },
      { name: 'A100', hex: '#ffffff', scss: 'mat.m2-get-color-from-palette(nak.$choir-app-primary, A100)' },
      { name: 'A200', hex: '#d7e9ff', scss: 'mat.m2-get-color-from-palette(nak.$choir-app-primary, A200)' },
      { name: 'A400', hex: '#a4cfff', scss: 'mat.m2-get-color-from-palette(nak.$choir-app-primary, A400)' },
      { name: 'A700', hex: '#8bc3ff', scss: 'mat.m2-get-color-from-palette(nak.$choir-app-primary, A700)' },
      { name: 'default-contrast', hex: '#ffffff', scss: 'mat.m2-get-contrast-color-from-palette(nak.$choir-app-primary, default)' }
    ];

    this.accentColors = [
      { name: '50', hex: '#fff8e5', scss: 'mat.m2-get-color-from-palette(nak.$choir-app-accent, 50)' },
      { name: '100', hex: '#ffefbf', scss: 'mat.m2-get-color-from-palette(nak.$choir-app-accent, 100)' },
      { name: '200', hex: '#ffe694', scss: 'mat.m2-get-color-from-palette(nak.$choir-app-accent, 200)' },
      { name: '300', hex: '#ffdc69', scss: 'mat.m2-get-color-from-palette(nak.$choir-app-accent, 300)' },
      { name: '400', hex: '#ffd547', scss: 'mat.m2-get-color-from-palette(nak.$choir-app-accent, 400)' },
      { name: '500', hex: '#ffce2c', scss: 'mat.m2-get-color-from-palette(nak.$choir-app-accent, 500)' },
      { name: '600', hex: '#ffca2c', scss: 'mat.m2-get-color-from-palette(nak.$choir-app-accent, 600)' },
      { name: '700', hex: '#ffc52c', scss: 'mat.m2-get-color-from-palette(nak.$choir-app-accent, 700)' },
      { name: '800', hex: '#ffc12c', scss: 'mat.m2-get-color-from-palette(nak.$choir-app-accent, 800)' },
      { name: '900', hex: '#ffb82c', scss: 'mat.m2-get-color-from-palette(nak.$choir-app-accent, 900)' },
      { name: 'A100', hex: '#ffffff', scss: 'mat.m2-get-color-from-palette(nak.$choir-app-accent, A100)' },
      { name: 'A200', hex: '#fff9f6', scss: 'mat.m2-get-color-from-palette(nak.$choir-app-accent, A200)' },
      { name: 'A400', hex: '#ffede3', scss: 'mat.m2-get-color-from-palette(nak.$choir-app-accent, A400)' },
      { name: 'A700', hex: '#ffe3d3', scss: 'mat.m2-get-color-from-palette(nak.$choir-app-accent, A700)' },
      { name: 'default-contrast', hex: '#000000', scss: 'mat.m2-get-contrast-color-from-palette(nak.$choir-app-accent, default)' }
    ];
  }

  onToggleDebugLogs(): void {
    this.logger.setEnabled(this.debugLogs);
    this.logger.log('Debug logging', this.debugLogs ? 'enabled' : 'disabled');
  }

  openDeployConsole(deploy: boolean): void {
    const token = localStorage.getItem('auth-token');
    const url = `${environment.apiUrl}/admin/develop/deploy${deploy ? '?deploy=true' : ''}`;
    const win = window.open('', '_blank', 'noopener=yes,width=800,height=600');
    if (!win) {
      return;
    }
    win.document.title = 'Deploy';
    win.document.body.style.background = '#000';
    win.document.body.style.color = '#fff';
    const pre = win.document.createElement('pre');
    pre.style.whiteSpace = 'pre-wrap';
    pre.style.margin = '0';
    win.document.body.appendChild(pre);
    fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
      .then(async res => {
        const reader = res.body?.getReader();
        if (!reader) {
          pre.textContent = 'No output';
          return;
        }
        const decoder = new TextDecoder();
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          pre.textContent += decoder.decode(value, { stream: true });
          win.scrollTo(0, win.document.body.scrollHeight);
        }
      })
      .catch(err => {
        pre.textContent += `\nError: ${err}`;
      });
  }
}
