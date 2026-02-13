# Figma Design Specs - Mobile Navigation

## Design System für NAK Chorleiter App

### 1. Farbpalette

#### Primary Colors
- **Brand Primary**: `#1976d2` (Blau)
- **Brand Accent**: `#ff4081` (Pink/Rot)
- **Brand Warn**: `#f44336` (Rot)

#### Semantic Colors
- **Success**: `#4caf50`
- **Warning**: `#ff9800`
- **Error**: `#f44336`
- **Info**: `#2196f3`

#### Neutral Colors
- **Background Light**: `#fafafa`
- **Background Dark**: `#303030`
- **Surface Light**: `#ffffff`
- **Surface Dark**: `#424242`
- **Text Primary Light**: `rgba(0, 0, 0, 0.87)`
- **Text Primary Dark**: `rgba(255, 255, 255, 0.87)`
- **Text Secondary Light**: `rgba(0, 0, 0, 0.6)`
- **Text Secondary Dark**: `rgba(255, 255, 255, 0.6)`

---

## 2. Bottom Navigation Bar

### Layout Specs

#### Frame: Bottom Nav (Mobile)
- **Width**: 360px - 428px (typische Smartphone-Breiten)
- **Height**: 64px (Standard), 56px (Small)
- **Position**: Fixed, Bottom: 0
- **Background**: Surface Color (`#ffffff` / `#424242`)
- **Shadow**: Elevation 8
  - Y: -2px
  - Blur: 8px
  - Color: `rgba(0, 0, 0, 0.15)`
- **Border Top**: 1px solid `rgba(0, 0, 0, 0.08)`

#### Navigation Items
- **Container**: Auto Layout (Horizontal)
- **Gap**: 0px
- **Distribution**: Space Between (gleichmäßig verteilt)
- **Max Items**: 5

#### Single Nav Item
- **Width**: Flex (1fr)
- **Max Width**: 168px
- **Height**: 64px
- **Padding**: 6px 12px 8px
- **Layout**: Auto Layout (Vertical)
- **Alignment**: Center
- **Gap**: 4px

##### Icon
- **Size**: 24x24px
- **Color**: 
  - Default: `rgba(0, 0, 0, 0.6)` / Text Secondary
  - Active: `#1976d2` / Brand Primary
- **Margin Bottom**: 4px

##### Label
- **Font**: Roboto
- **Size**: 12px (0.75rem)
- **Weight**: 500 (Medium)
- **Color**: 
  - Default: `rgba(0, 0, 0, 0.6)`
  - Active: `#1976d2`

##### Active State Indicator
- **Type**: Rectangle
- **Width**: 32px
- **Height**: 3px
- **Position**: Absolute, Top: 0
- **Color**: `#1976d2`
- **Border Radius**: 0 0 3px 3px

##### Hover State (Desktop)
- **Background**: `rgba(0, 0, 0, 0.04)`
- **Transition**: 150ms ease

##### Ripple Effect
- **Color**: `rgba(0, 0, 0, 0.1)`
- **Duration**: 300ms
- **Easing**: ease-out

---

## 3. Sidenav (Hamburger Menu)

### Desktop
- **Width**: 220px
- **Height**: 100vh
- **Background**: Surface Color
- **Shadow**: Elevation 2
- **Mode**: Side (permanent)

### Mobile
- **Width**: 85vw (max 320px)
- **Height**: 100vh
- **Background**: Surface Color
- **Shadow**: Elevation 16
- **Mode**: Over (overlay)
- **Animation**: 200ms cubic-bezier(0.4, 0, 0.2, 1)

### Menu Items
- **Height**: 48px
- **Padding**: 0 16px
- **Icon Size**: 24x24px
- **Icon Margin Right**: 16px
- **Font**: Roboto 14px/400
- **Gap**: 12px (between icon and text)

---

## 4. Mobile Toolbar

### Frame Specs
- **Height**: 56px (Mobile), 64px (Desktop)
- **Background**: Primary Color (`#1976d2`)
- **Shadow**: Elevation 4
- **Position**: Sticky, Top: 0
- **Z-Index**: 100

### Elements

#### Hamburger Icon
- **Size**: 48x48px (Touch Target)
- **Icon**: 24x24px
- **Position**: Left: 4px
- **Color**: White

#### Title
- **Font**: Roboto
- **Size**: 20px
- **Weight**: 500
- **Color**: White
- **Margin Left**: 16px

#### Search (Expanded State)
- **Width**: Calc(100vw - 104px)
- **Height**: 40px
- **Background**: `rgba(255, 255, 255, 0.15)`
- **Border Radius**: 4px
- **Padding**: 0 12px
- **Animation**: 200ms scale-in

#### Icons (Right Side)
- **Size**: 48x48px (Touch Target)
- **Icon Size**: 24x24px
- **Color**: White
- **Spacing**: 4px

---

## 5. Choir Switcher Bottom Sheet

### Container
- **Max Height**: 70vh
- **Background**: Surface Color
- **Border Radius**: 16px 16px 0 0
- **Shadow**: Elevation 16

### Header
- **Height**: 64px
- **Padding**: 16px
- **Border Bottom**: 1px solid Divider
- **Background**: Surface (Sticky)
- **Title**: Roboto 20px/500

### List Items
- **Height**: 72px
- **Padding**: 16px
- **Layout**: Auto Layout (Horizontal)
- **Gap**: 16px

#### Active Item
- **Background**: `rgba(25, 118, 210, 0.08)`
- **Icon Color**: Brand Primary
- **Border Left**: 4px solid Brand Primary

---

## 6. Floating Action Button (FAB)

### Main FAB
- **Size**: 56x56px
- **Border Radius**: 50% (Circle)
- **Background**: Accent Color (`#ff4081`)
- **Icon Size**: 24x24px
- **Icon Color**: White
- **Shadow**: Elevation 6
- **Position**: 
  - Bottom: 80px (Mobile), 24px (Desktop)
  - Right: 16px (Mobile), 24px (Desktop)

### Mini FAB (Speed Dial Items)
- **Size**: 40x40px
- **Border Radius**: 50%
- **Background**: Default (`#ffffff`)
- **Icon Size**: 24x24px
- **Shadow**: Elevation 4
- **Spacing**: 12px vertical

### Speed Dial Labels
- **Background**: `rgba(97, 97, 97, 0.9)`
- **Color**: White
- **Padding**: 6px 12px
- **Border Radius**: 4px
- **Font**: Roboto 14px/400
- **Shadow**: Elevation 2
- **Position**: Right: 56px

---

## 7. Component States

### Interactive States

#### Default
- Opacity: 100%
- Background: Transparent/Surface

#### Hover (Desktop only)
- Background: `rgba(0, 0, 0, 0.04)`
- Transition: 150ms

#### Focus
- Outline: 2px solid Primary
- Outline Offset: 2px

#### Active/Pressed
- Background: `rgba(0, 0, 0, 0.12)`
- Icon: Transform scale(0.95)

#### Disabled
- Opacity: 38%
- Cursor: not-allowed

---

## 8. Animations

### Slide In/Out (Sidenav)
```
Duration: 200ms (Mobile), 250ms (Desktop)
Easing: cubic-bezier(0.4, 0, 0.2, 1)
Property: transform (translateX)
```

### Fade In/Out
```
Duration: 150ms
Easing: linear
Property: opacity
```

### Scale (FAB, Buttons)
```
Duration: 200ms
Easing: cubic-bezier(0.4, 0, 0.2, 1)
Property: transform (scale)
```

### Ripple
```
Duration: 300ms
Easing: ease-out
Property: transform (scale), opacity
```

---

## 9. Typography Scale

| Element | Font | Size | Weight | Line Height |
|---------|------|------|--------|-------------|
| H1 | Roboto | 96px | 300 | 112px |
| H2 | Roboto | 60px | 300 | 72px |
| H3 | Roboto | 48px | 400 | 56px |
| H4 | Roboto | 34px | 400 | 42px |
| H5 | Roboto | 24px | 400 | 32px |
| H6 | Roboto | 20px | 500 | 32px |
| Subtitle 1 | Roboto | 16px | 400 | 24px |
| Subtitle 2 | Roboto | 14px | 500 | 24px |
| Body 1 | Roboto | 16px | 400 | 24px |
| Body 2 | Roboto | 14px | 400 | 20px |
| Button | Roboto | 14px | 500 | 16px |
| Caption | Roboto | 12px | 400 | 16px |
| Overline | Roboto | 10px | 400 | 16px |

---

## 10. Spacing System

### Base: 8px Grid

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Minimal spacing |
| sm | 8px | Tight spacing |
| md | 16px | Default spacing |
| lg | 24px | Comfortable spacing |
| xl | 32px | Loose spacing |
| 2xl | 48px | Section spacing |
| 3xl | 64px | Large sections |

---

## 11. Icons

### Icon Library
- **Source**: Material Icons
- **Style**: Filled (Primary), Outlined (Secondary)
- **Size**: 24x24px (Default), 18px (Small), 36px (Large)

### Common Icons Used
- `home` - Home
- `event` - Termine/Events
- `library_music` - Repertoire
- `menu` - Hamburger Menu
- `search` - Search
- `close` - Close
- `groups` - Chöre
- `add` - FAB
- `more_horiz` - More/Overflow

---

## 12. Accessibility

### Touch Targets
- **Minimum**: 44x44px (iOS)
- **Recommended**: 48x48px (Material Design)
- **Spacing**: Min. 8px between targets

### Color Contrast
- **Normal Text**: Min. 4.5:1
- **Large Text (18pt+)**: Min. 3:1
- **UI Components**: Min. 3:1

### Focus Indicators
- **Visible**: Always visible when focused
- **Size**: 2px outline
- **Color**: Primary or High Contrast
- **Offset**: 2px

---

## 13. Responsive Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| XS | < 360px | Sehr kleine Handsets |
| SM | 360px - 599px | Standard Handsets |
| MD | 600px - 959px | Tablets (Portrait) |
| LG | 960px - 1279px | Tablets (Landscape) / Small Desktop |
| XL | 1280px+ | Desktop |

---

## 14. Figma Best Practices

### Layer Naming
```
✅ Good:
- Bottom Nav / Item / Home / Icon
- Bottom Nav / Item / Home / Label
- Bottom Nav / Item / Home / Active Indicator

❌ Bad:
- Rectangle 123
- Group 456
- Icon
```

### Component Structure
```
🔸 Bottom Nav (Main Component)
  ├── 🔸 Nav Item (Component)
  │   ├── 🔹 Icon (Instance)
  │   ├── 📝 Label (Text)
  │   └── 🟦 Active Indicator (Shape)
  ├── ...
```

### Auto Layout
- Nutze Auto Layout für alle Container
- Definiere klare Padding-/Gap-Werte
- Verwende "Fill Container" für responsive Elemente

### Variants
Erstelle Variants für:
- States (Default, Hover, Active, Disabled)
- Themes (Light, Dark)
- Sizes (Small, Default, Large)

---

## 15. Export Settings

### Icons
- **Format**: SVG
- **Size**: 24x24px
- **Color**: Black (#000000)
- **Naming**: `ic_[name]_24px.svg`

### Assets
- **1x**: Standard
- **2x**: @2x für Retina
- **3x**: @3x für High DPI

### Screenshots (für Dokumentation)
- **Format**: PNG
- **Resolution**: 2x
- **Background**: Include background

---

## User Testing Template

### Testszenarien

#### Szenario 1: Navigation zu Terminen
1. Öffne die App
2. Navigiere zu "Termine"
3. **Erfolg**: Nutzer findet den "Termine"-Button in < 3 Sekunden

#### Szenario 2: Chor wechseln
1. Tippe auf Chor-Icon in der Toolbar
2. Wähle einen anderen Chor
3. **Erfolg**: Aktion wird in < 5 Sekunden abgeschlossen

#### Szenario 3: Neues Stück hinzufügen
1. Navigiere zu Repertoire
2. Tippe auf FAB
3. Wähle "Stück hinzufügen"
4. **Erfolg**: Nutzer versteht die Aktion sofort

### Metriken
- **Task Completion Rate**: > 95%
- **Time on Task**: < 10 Sekunden pro Aktion
- **Error Rate**: < 5%
- **SUS Score**: > 70 (Good), > 80 (Excellent)

---

**Version**: 1.0  
**Erstellt für**: Figma Design System  
**Zielplattform**: iOS & Android (Progressive Web App)  
**Material Design Version**: 3
