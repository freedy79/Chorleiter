# Mobile Navigation Optimierung - NAK Chorleiter App

## Übersicht

Die mobile Navigation wurde umfassend optimiert, um eine bessere User Experience auf Smartphones und Tablets zu bieten. Die Implementierung folgt Material Design Guidelines und Best Practices für mobile Webanwendungen.

## 1. Bottom Navigation Bar

### Features
- **Max. 5 wichtigste Items**: Reduzierung auf die am häufigsten genutzten Funktionen
- **Dynamische Anzeige**: Items werden basierend auf Benutzerrolle angepasst
- **Overflow-Menü**: Zusätzliche Items in "Mehr"-Menü
- **Deutlicher Active State**: 
  - Farbliche Hervorhebung (Brand Color)
  - Icon-Vergrößerung (scale 1.1)
  - Top-Indicator-Bar (3px blaue Linie)
- **Responsive Labels**:
  - < 360px: Nur Icons
  - 361px - 599px: Icons + Labels
  - ≥ 600px: Bottom Nav versteckt

### Implementierung
```typescript
// In main-layout.component.html
<nav class="bottom-nav" *ngIf="(isLoggedIn$ | async)">
  <a mat-button routerLink="/" class="bottom-nav-item" 
     routerLinkActive="active">
    <mat-icon>home</mat-icon>
    <span class="nav-label">Home</span>
  </a>
  <!-- ... weitere Items ... -->
</nav>
```

### Styling-Highlights
```scss
.bottom-nav-item {
  &.active {
    color: var(--brand, #1976d2);
    
    mat-icon {
      transform: scale(1.1);
    }
    
    &::before {
      content: '';
      position: absolute;
      top: 0;
      width: 32px;
      height: 3px;
      background: var(--brand, #1976d2);
    }
  }
}
```

## 2. Hamburger-Menü (Sidenav)

### Optimierungen
- **Schnellere Animationen**:
  - Desktop: 250ms
  - Mobile: 200ms
  - Timing: cubic-bezier(0.4, 0, 0.2, 1)
- **Optimierte Breite**:
  - Mobile: 85vw (max 320px)
  - Desktop: 220px
- **Touch-Close**: Backdrop-Click schließt das Menü
- **Auto-Close**: Menü schließt automatisch nach Navigation auf Handsets

### Code
```typescript
toggleDrawer() {
  this._appDrawer?.toggle();
}

closeSidenav() {
  if (this.isHandset) {
    this._appDrawer?.close();
  }
}
```

## 3. Mobile Toolbar

### Kontext-sensitive Features

#### Expandable Search
- **Desktop**: Immer sichtbar
- **Mobile**: 
  - Collapsed: Nur Such-Icon
  - Expanded: Volle Suchleiste
  - Animation: 200ms slide-in

```typescript
searchExpanded = false;

toggleSearch(): void {
  this.searchExpanded = !this.searchExpanded;
}
```

#### Choir Switcher
- **Desktop**: Dropdown-Menü (mat-menu)
- **Mobile**: Bottom Sheet (bessere Erreichbarkeit)
- **Features**:
  - Scrollbare Liste bei vielen Chören
  - Active-Indicator
  - Gemeinde-Zuordnung sichtbar

```typescript
openChoirSwitcher(): void {
  const bottomSheetRef = this.bottomSheet.open(ChoirSwitcherSheetComponent, {
    data: { choirs, activeChoirId },
    panelClass: 'choir-switcher-bottom-sheet'
  });
}
```

## 4. Floating Action Button (FAB)

### Features
- **Kontextsensitiv**: Kann dynamisch angezeigt/versteckt werden
- **Speed-Dial-Menü**: Mehrere Aktionen möglich
- **Auto-Hide beim Scrollen**:
  - Versteckt beim Scrollen nach unten
  - Erscheint beim Scrollen nach oben
  - Schwellenwert: 50px
- **Position**: 
  - Mobile: 80px von unten (über Bottom Nav)
  - Desktop: 24px von unten/rechts

### Verwendung
```typescript
import { FabComponent, FabAction } from '@shared/components/fab/fab.component';

fabActions: FabAction[] = [
  {
    icon: 'library_add',
    label: 'Stück hinzufügen',
    action: () => this.addPiece(),
    color: 'primary'
  },
  {
    icon: 'queue_music',
    label: 'Programm erstellen',
    action: () => this.createProgram(),
    color: 'accent'
  }
];
```

```html
<app-fab 
  icon="add"
  color="accent"
  [actions]="fabActions"
  [hideOnScroll]="true"
  tooltip="Aktionen">
</app-fab>
```

## 5. Responsive Breakpoints

### Definierte Breakpoints

| Name | Range | Beschreibung |
|------|-------|--------------|
| **Handset** | < 600px | Smartphones im Hochformat |
| **Handset Landscape** | 600px - 959px | Smartphones im Querformat |
| **Tablet** | 600px - 1024px | Tablets |
| **Desktop** | > 1024px | Desktop-Geräte |
| **Small Screen** | < 600px | Für spezifische Features (Search, etc.) |

### Implementierung
```typescript
// Handset Detection
this.isHandset$ = this.breakpointObserver
  .observe([Breakpoints.Handset])
  .pipe(map(result => result.matches));

// Small Screen Detection
this.isSmallScreen$ = this.breakpointObserver
  .observe('(max-width: 600px)')
  .pipe(map(result => result.matches));
```

### Layout-Anpassungen pro Breakpoint

#### < 360px (Sehr kleine Handsets)
- Bottom Nav: Nur Icons (56px hoch)
- Toolbar: Reduzierte Gaps
- Kompaktere Schriften

#### 360px - 599px (Standard Handsets)
- Bottom Nav: Icons + Labels (64px hoch)
- Expandable Search
- Choir Switcher als Bottom Sheet

#### 600px - 1024px (Tablets)
- Bottom Nav versteckt
- Sidenav als Side-Mode
- Normale Search Bar
- Choir Badge als Button

#### > 1024px (Desktop)
- Vollständige Navigation
- Sidenav permanent sichtbar
- Alle Features aktiv

## 6. Navigation Patterns

### Back-Button-Handling
```typescript
// Browser History Integration
this.router.events.pipe(
  filter(event => event instanceof NavigationEnd)
).subscribe(() => {
  this.closeSidenav(); // Auto-close auf Mobile
});
```

### Deep-Linking Support
- Alle Routen sind direkt verlinkbar
- State Preservation über Router
- Query-Parameter werden erhalten

### Smooth Scroll-Behavior
```scss
html {
  scroll-behavior: smooth;
}

@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }
}
```

## 7. Accessibility (A11y)

### Features
- **ARIA-Labels**: Alle Buttons haben aria-label
- **Keyboard Navigation**: Alle Elemente per Tab erreichbar
- **Focus-Indikatoren**: Sichtbare Focus-States
- **Screen Reader**: 
  - Role-Attribute (navigation, dialog)
  - Semantisches HTML
  - Beschreibende Labels

```html
<button type="button" 
        aria-label="Menü umschalten" 
        class="sidenav-toggle" 
        mat-icon-button 
        (click)="toggleDrawer()">
  <mat-icon aria-label="Side nav toggle icon">menu</mat-icon>
</button>
```

## 8. Performance-Optimierungen

### Bundle Size
- Standalone Components für besseres Tree-Shaking
- Lazy Loading von Bottom Sheet Component
- RxJS Operatoren optimal eingesetzt

### Animations
- CSS Animations statt JS wo möglich
- GPU-beschleunigte Properties (transform, opacity)
- Optimierte Timing-Functions

### Rendering
- OnPush Change Detection Strategy (wo möglich)
- Async Pipe für automatisches Unsubscribe
- ShareReplay für Observables

```typescript
this.isHandset$ = this.breakpointObserver
  .observe([Breakpoints.Handset])
  .pipe(
    map(result => result.matches),
    shareReplay({ bufferSize: 1, refCount: true })
  );
```

## 9. Testing-Empfehlungen

### Unit Tests
```typescript
describe('MainLayoutComponent - Mobile Navigation', () => {
  it('should show bottom nav on handset', () => {
    component.isHandset$ = of(true);
    fixture.detectChanges();
    const bottomNav = fixture.nativeElement.querySelector('.bottom-nav');
    expect(bottomNav).toBeTruthy();
  });

  it('should toggle search on mobile', () => {
    component.searchExpanded = false;
    component.toggleSearch();
    expect(component.searchExpanded).toBe(true);
  });
});
```

### E2E Tests (Cypress)
```typescript
describe('Mobile Navigation', () => {
  beforeEach(() => {
    cy.viewport('iphone-x');
    cy.login();
  });

  it('should navigate using bottom nav', () => {
    cy.get('.bottom-nav-item[href="/events"]').click();
    cy.url().should('include', '/events');
  });

  it('should open choir switcher', () => {
    cy.get('.choir-badge-mobile').click();
    cy.get('.choir-switcher-sheet').should('be.visible');
  });
});
```

### Device Testing
- **Handsets**: iPhone SE, iPhone 14, Samsung Galaxy S23
- **Tablets**: iPad, Samsung Galaxy Tab
- **Browsers**: Chrome Mobile, Safari iOS, Samsung Internet

## 10. User Testing & Metrics

### Zu messende KPIs
- **Task Completion Time**: Zeit für typische Navigationsaufgaben
- **Error Rate**: Fehlerhafte Klicks/Taps
- **User Satisfaction**: SUS-Score (System Usability Scale)
- **Navigation Efficiency**: Anzahl Klicks für häufige Tasks

### Heatmap-Analyse
- Tracking von Tap-Positionen
- Scroll-Verhalten
- Am häufigsten genutzte Navigation-Items

### A/B-Testing Ideen
1. Bottom Nav: 4 vs. 5 Items
2. FAB Position: Links vs. Rechts
3. Search: Immer sichtbar vs. Expandable
4. Choir Switcher: Bottom Sheet vs. Full-Screen Modal

## 11. Zukünftige Erweiterungen

### Geplante Features
1. **Swipe-Gesten**:
   - Swipe-to-Close für Sidenav
   - Swipe zwischen Tabs
   - Pull-to-Refresh

2. **Progressive Web App**:
   - Install-Prompt
   - Offline-Modus
   - Push-Notifications

3. **Adaptive Loading**:
   - Reduzierte Bilder auf langsamen Verbindungen
   - Lazy Loading für Bilder
   - Code-Splitting

4. **Voice Navigation**:
   - Sprachsteuerung für Navigation
   - Voice Commands

### Technical Debt
- [ ] Swipe-Gesten für Sidenav implementieren
- [ ] Tab-Navigation swipeable machen
- [ ] FAB-Komponente in mehr Features integrieren
- [ ] Bessere Animation für Bottom Nav Show/Hide
- [ ] Dark Mode Optimierungen für alle neuen Components

## 12. Best Practices für Entwickler

### Do's ✅
- Nutze Material Design Breakpoints
- Teste auf echten Geräten
- Implementiere Touch-Targets min. 48x48px
- Verwende semantisches HTML
- Optimiere für One-Handed Use
- Implementiere Progressive Enhancement

### Don'ts ❌
- Keine zu kleinen Touch-Targets (< 44px)
- Keine langen Listen ohne Virtual Scrolling
- Keine Auto-Playing Animations
- Keine komplexen Hover-States (nicht auf Touch)
- Keine Fixed Position ohne Scroll-Handling

## 13. Ressourcen

### Material Design Guidelines
- [Navigation](https://material.io/components/bottom-navigation)
- [App bars](https://material.io/components/app-bars-bottom)
- [Floating Action Buttons](https://material.io/components/buttons-floating-action-button)

### Angular Material
- [Sidenav](https://material.angular.io/components/sidenav/overview)
- [Bottom Sheet](https://material.angular.io/components/bottom-sheet/overview)
- [Breakpoint Observer](https://material.angular.io/cdk/layout/overview)

### Testing
- [Cypress Mobile Testing](https://docs.cypress.io/api/commands/viewport)
- [Lighthouse Mobile Audit](https://developers.google.com/web/tools/lighthouse)

---

**Version**: 1.0  
**Letzte Aktualisierung**: Februar 2026  
**Autor**: GitHub Copilot  
**Review**: Empfohlen vor Production-Deployment
