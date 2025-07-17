import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';

interface PaletteColor {
  name: string;
  hex: string;
  scss: string;
}

@Component({
  selector: 'app-develop',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './develop.component.html',
  styleUrls: ['./develop.component.scss']
})
export class DevelopComponent implements OnInit {
  primaryColors: PaletteColor[] = [];
  accentColors: PaletteColor[] = [];

  ngOnInit(): void {
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
}
