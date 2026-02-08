# Mobile Admin-Bereich - Best Practices

## 📱 Mobile Design Patterns

### 1. **Bottom Sheet für Formulare**

Statt modaler Dialoge auf Mobile:

```typescript
import { MatBottomSheet } from '@angular/material/bottom-sheet';

constructor(private bottomSheet: MatBottomSheet) {}

openAddDialog() {
  this.bottomSheet.open(AddItemComponent);
}
```

```html
<!-- bottom-sheet würde automatisch mobil angepasst -->
<mat-dialog-container *ngIf="!(isMobile$ | async)"></mat-dialog-container>
<mat-bottom-sheet *ngIf="(isMobile$ | async)"></mat-bottom-sheet>
```

### 2. **Swipe Actions für Tabellenaktionen**

```typescript
import { HammerModule } from '@angular/platform-browser';

// Für Swipe-Gesten
@HostListener('swipeleft', ['$event']) onSwipeLeft() {
  this.showActions = true;
}
```

### 3. **Floating Action Buttons (FAB)**

Hauptaktion immer zugreifbar:

```html
<button mat-fab (click)="addNew()" class="fab-button">
  <mat-icon>add</mat-icon>
</button>
```

```scss
.fab-button {
  position: fixed;
  bottom: 16px;
  right: 16px;
  z-index: 1000;
}
```

### 4. **Compact Forms**

```html
<!-- Mobile: Vereinfachte Felder -->
<form *ngIf="isMobile$ | async">
  <mat-form-field appearance="outline" class="full-width">
    <mat-label>Name</mat-label>
    <input matInput>
  </mat-form-field>
</form>
```

```scss
form {
  @media (max-width: 600px) {
    .full-width {
      width: 100%;
    }

    mat-form-field {
      margin-bottom: 12px;
    }
  }
}
```

---

## 🎨 UI/UX Patterns

### Touch-freundliche Button-Größen

```scss
// Min. 44x44px für Touch-Ziele
button {
  min-height: 44px;
  min-width: 44px;
  padding: 12px 16px;
}
```

### Readability auf Mobile

```scss
// Größere Texte auf Mobile
@media (max-width: 600px) {
  h1 { font-size: 22px; } // statt 28px
  h2 { font-size: 18px; } // statt 24px
  p { font-size: 14px; }  // statt 16px
}
```

### Vertical Scrolling Optimization

```html
<!-- One column für Mobile, nicht horizontal scroll -->
<div class="grid" [class.mobile]="isMobile$ | async">
  <!-- Items -->
</div>
```

```scss
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
}
```

---

## ⚡ Performance

### Lazy Loading

```typescript
// Route konfigurieren
const routes = [
  {
    path: 'admin',
    loadComponent: () => import('./admin.component').then(m => m.AdminComponent)
  }
];
```

### Change Detection

```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminDashboardComponent {
  constructor(private cdr: ChangeDetectorRef) {}
}
```

### Image Optimization

```html
<img [src]="imagePath" loading="lazy" alt="...">
```

---

## 🔍 Responsive Table Patterns

### Pattern 1: Table → Cards

```html
<!-- Desktop: Table -->
<mat-table *ngIf="!(isMobile$ | async)">
  <!-- columns -->
</mat-table>

<!-- Mobile: Cards -->
<mat-card *ngFor="let item of data" *ngIf="isMobile$ | async">
  <div class="card-row">
    <span class="label">Name</span>
    <span class="value">{{ item.name }}</span>
  </div>
</mat-card>
```

### Pattern 2: Collapsible Rows

```html
<mat-accordion>
  <mat-expansion-panel *ngFor="let item of data">
    <mat-expansion-panel-header>
      {{ item.name }}
    </mat-expansion-panel-header>
    <div class="details">
      <!-- Weitere Details -->
    </div>
  </mat-expansion-panel>
</mat-accordion>
```

### Pattern 3: Progressive Disclosure

```html
<mat-card>
  <mat-card-header>
    {{ item.primaryInfo }}
  </mat-card-header>
  <mat-card-content *ngIf="expanded">
    <!-- Weitere Infos nur wenn expanded -->
  </mat-card-content>
  <button (click)="expanded = !expanded">
    {{ expanded ? 'Weniger' : 'Mehr' }}
  </button>
</mat-card>
```

---

## 📋 Checkliste für Mobile-optimierte Admin-Komponente

- [ ] Responsive Layout (Desktop/Mobile)
- [ ] Touch-freundliche Button-Größen (min. 44x44px)
- [ ] Lesbare Schriftgrößen
- [ ] Single-column Layout auf Mobile
- [ ] FAB für Hauptaktion
- [ ] Bottom-Sheet statt Dialog (optional)
- [ ] Pagination für große Listen
- [ ] Swipe-Gesten unterstützen (optional)
- [ ] Lazy Loading für Images/Components
- [ ] OnPush Change Detection
- [ ] Accessible (a11y) - ARIA labels

---

## 🎯 Admin-Bereich Mobile-Roadmap

### Phase 1: Foundation ✅
- [x] Dashboard mit Responsive Layout
- [x] Tab-Navigation für Hubs
- [x] Responsive Table Component
- [x] Mobile Card-Layout

### Phase 2: Enhancements
- [ ] Swipe-Actions implementieren
- [ ] Bottom-Sheets für Formulare
- [ ] PWA-Features (Offline-Support)
- [ ] Native App Icons

### Phase 3: Advanced
- [ ] Gesture-Controls
- [ ] Advanced Filtering UI
- [ ] Search Optimization
- [ ] Performance Monitoring

---

## 📱 Device Testing

### Empfohlen: Chrome DevTools

```
F12 → Device Toolbar → Select Device
- iPhone 13
- Pixel 5
- iPad
```

### Breakpoints zu testen

- 320px (Small phones)
- 600px (Tablets)
- 768px (iPad)
- 1024px (Desktop)

### Performance-Test

```
Lighthouse → Mobile
- Accessibility: > 90
- Performance: > 80
```

---

## 🚀 Launch Checklist

- [ ] Alle Komponenten geladen
- [ ] Responsive auf 320px - 1920px
- [ ] Touch-Targets korrekt
- [ ] Performance > 80 (Lighthouse Mobile)
- [ ] A11y > 90
- [ ] Offline-Fallback
- [ ] Dark Mode funktioniert
- [ ] Analytics integriert
