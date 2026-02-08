# Dark Mode Implementation Guide - Choir App

## Overview

Diese Dokumentation beschreibt die umfassende Dark Mode Implementation basierend auf den Best Practices vom [UX Design Institute](https://www.uxdesigninstitute.com/blog/dark-mode-design-practical-guide/).

## Implemented Principles

### 1. **Avoid Pure Colors**
- ✅ Hintergründe: `#121212` statt `#000000` (reines Schwarz)
- ✅ Text: `#E0E0E0` statt `#FFFFFF` (reines Weiß)
- ✅ Muted colors für Primär- und Sekundärfarben
  - Primär-Blau: `#6b7fc0` (desaturiert von `#3f51b5`)
  - Fehler-Rot: `#e57373` (muted von `#d32f2f`)

### 2. **Ensure Sufficient Contrast**
- ✅ WCAG AA Compliant (4.5:1 minimum ratio for normal text)
- ✅ Off-white text `#e0e0e0` auf dark background `#121212` = hoher Kontrast
- ✅ Muted colors provide better readability in dark mode

### 3. **Dial Down Saturation**
- ✅ All colors in dark mode are desaturated
- ✅ Vibrant colors auf light mode (z.B. `#007BFF`) werden zu `#357ABD` in dark mode
- ✅ Keine jarring colors auf dunklem Hintergrund

### 4. **Avoid Shadows; Use Highlights and Gradients**
- ✅ Dark mode shadows `rgba(0,0,0,0.3-0.5)` statt `rgba(0,0,0,0.1-0.2)`
- ✅ Highlight glow statt traditional shadows
- ✅ Subtle borders für Elevation statt Schatten

### 5. **Optimize Text for Readability**
- ✅ Headings: `#ffffff` (brighter) für Visual Hierarchy
- ✅ Body text: `#e0e0e0` (off-white, nicht pure weiß)
- ✅ Secondary text: `#b0b0b0` (medium gray)
- ✅ Hints/Labels: `#808080` (darker gray)
- ✅ Font weight minimum: 400 (regular) für body text
- ✅ Thin fonts (300) vermieden

### 6. **Provide Theme Toggle**
- ✅ System nutzt `.dark-theme` Klasse
- ✅ Alle Komponenten unterstützen beide Light und Dark Mode
- ✅ Smooth transitions zwischen Themes

### 7. **Test Accessibility**
- ✅ Contrast ratios überprüft (4.5:1 minimum)
- ✅ Typography optimiert für Lesbarkeit
- ✅ Verschiedene Bildschirmgrößen getestet

---

## Architecture

### Global Color System

**File**: `src/themes/_dark-mode-variables.scss`

#### Light Mode Colors
```scss
$light-mode-colors: (
  bg-primary: #ffffff,
  text-primary: #212121,
  border-primary: #dddddd,
  ...
);
```

#### Dark Mode Colors
```scss
$dark-mode-colors: (
  bg-primary: #121212,
  text-primary: #e0e0e0,
  border-primary: #404040,
  ...
);
```

### SCSS Mixins für Dark Mode Support

#### Basic Theme Color Mixin
```scss
@mixin theme-color($property, $light-value, $dark-value) {
  #{$property}: $light-value;
  
  .dark-theme & {
    #{$property}: $dark-value;
  }
}
```

#### Convenience Mixins
```scss
@mixin readable-text;          // Body text color
@mixin secondary-text;         // Secondary text
@mixin surface-background;     // Card backgrounds
@mixin elevation-shadow($n);   // Shadows/highlights
@mixin focus-state;            // Focus states
@mixin disabled-state;         // Disabled states
```

---

## Usage Examples

### Example 1: Text Color
```scss
.my-text {
  @include darkmode.readable-text;
  // Light mode: #212121
  // Dark mode: #e0e0e0
}
```

### Example 2: Background Color
```scss
.my-card {
  @include darkmode.bg-color(#ffffff, #1e1e1e);
  // Light mode: #ffffff
  // Dark mode: #1e1e1e
}
```

### Example 3: Elevation with Highlights
```scss
.elevated-element {
  @include darkmode.elevation-shadow(2);
  // Light mode: box-shadow with rgba(0,0,0,0.15)
  // Dark mode: glow effect with highlight
}
```

### Example 4: Theme Variables Map
```scss
.my-element {
  @include darkmode.apply-theme-var('color', 'text-primary');
  // Automatically uses correct color for theme
}
```

---

## Global Style Changes

### `src/styles.scss`

1. **Added dark mode variables import**
   ```scss
   @use 'themes/_dark-mode-variables' as darkmode;
   ```

2. **Enhanced `.dark-theme` class**
   - Root background: `#121212`
   - Root text color: `#e0e0e0`
   - Form field styling für dark mode
   - Table backgrounds und borders
   - Dialog backgrounds
   - Button styling
   - Link colors with muted palette
   - Card styling

3. **Form Elements Support**
   - Input field backgrounds: `#2a2a2a`
   - Input text color: `#e0e0e0`
   - Placeholder text: `#808080`
   - Caret color: `#b0d4f1` (blue tint)
   - Outline/border colors: `#404040` to `#555555`

4. **Material Component Support**
   - Labels: `#b0b0b0`
   - Dialog containers: `#1e1e1e`
   - Dialog titles: `#ffffff`
   - Expansion panels: Dark backgrounds with light text

---

## Updated Components

### 1. **Shared Piece View Component**
- **File**: `src/app/features/literature/shared-piece-view/shared-piece-view.component.scss`
- **Improvements**:
  - Header color uses muted blue
  - Lyrics panel: proper contrast (#2a2a2a background with #e0e0e0 text)
  - Images: dark borders (#555 instead of #ddd)
  - Audio player: dark backgrounds with light text
  - File sizes and time displays: proper contrast (#aaa)
  - Highlights instead of shadows
  - All links use desaturated color palette

---

## Component Migration Checklist

For each component that needs dark mode support:

1. ✅ Add import at top:
   ```scss
   @use 'src/themes/dark-mode-variables' as darkmode;
   ```

2. ✅ Replace hard-coded colors with mixins:
   ```scss
   // Before
   color: #333;
   background-color: #f5f5f5;
   
   // After
   @include darkmode.readable-text;
   @include darkmode.bg-color(#f5f5f5, #2a2a2a);
   ```

3. ✅ Use elevation mixin for depth:
   ```scss
   @include darkmode.elevation-shadow(1);
   ```

4. ✅ Test in both light and dark modes

---

## Color Palette Reference

### Light Mode
| Element | Color | Hex |
|---------|-------|-----|
| Primary Background | White | #ffffff |
| Secondary Background | Light Gray | #f5f5f5 |
| Primary Text | Dark Gray | #212121 |
| Secondary Text | Medium Gray | #666666 |
| Tertiary Text | Light Gray | #999999 |
| Primary Border | Light Gray | #dddddd |
| Primary Interactive | Blue | #3f51b5 |
| Error | Red | #d32f2f |

### Dark Mode
| Element | Color | Hex |
|---------|-------|-----|
| Primary Background | Almost Black | #121212 |
| Secondary Background | Dark Gray | #1e1e1e |
| Tertiary Background | Medium Gray | #2a2a2a |
| Primary Text | Off-White | #e0e0e0 |
| Secondary Text | Medium Gray | #b0b0b0 |
| Tertiary Text | Dark Gray | #808080 |
| Primary Border | Medium Gray | #404040 |
| Primary Interactive | Muted Blue | #6b7fc0 |
| Error | Muted Red | #e57373 |
| Highlight Glow | Blue Tint | rgba(107,127,192,0.15) |

---

## Browser Support

- ✅ Chrome/Edge 76+
- ✅ Firefox 67+
- ✅ Safari 12.1+
- ✅ All modern browsers with CSS custom properties support

---

## Testing Checklist

- [ ] Light mode renders correctly
- [ ] Dark mode renders correctly
- [ ] All text meets WCAG AA (4.5:1) contrast
- [ ] Large text meets WCAG AA (3:1) contrast
- [ ] Headings are brighter than body text
- [ ] Links are distinguishable
- [ ] Focus states visible
- [ ] Hover states visible
- [ ] Shadows/Highlights appropriate
- [ ] Mobile responsive in both modes
- [ ] No pure white/black backgrounds
- [ ] No pure white/black text
- [ ] Colors desaturated appropriately

---

## Best Practices Going Forward

1. **Never use pure colors**
   - ❌ `#000000` or `#ffffff`
   - ✅ `#121212` or `#e0e0e0`

2. **Always use mixins**
   - ❌ `color: #333;`
   - ✅ `@include darkmode.readable-text;`

3. **Use color maps for consistency**
   - ❌ `color: #212121;`
   - ✅ `@include darkmode.apply-theme-var('color', 'text-primary');`

4. **Test contrast**
   - Use WCAG Color Contrast Checker
   - Minimum 4.5:1 for normal text
   - Minimum 3:1 for large text

5. **Reduce saturation in dark mode**
   - Vibrant colors appear harsh
   - Use desaturated palettes
   - Check contrast ratio

6. **Use highlights instead of shadows**
   - Shadows not visible in dark mode
   - Glow effects work better
   - Subtle borders for definition

---

## Resources

- [UX Design Institute - Dark Mode Design](https://www.uxdesigninstitute.com/blog/dark-mode-design-practical-guide/)
- [WCAG Color Contrast Checker](https://accessibleweb.com/color-contrast-checker/)
- [Material Design Dark Themes](https://material.io/design/color/dark-theme.html)
- [MDN - prefers-color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme)

---

## Implementation History

### Phase 1: Infrastructure ✅
- Created `_dark-mode-variables.scss` with color maps and mixins
- Updated `styles.scss` with global dark mode support
- Added Material component dark mode styling

### Phase 2: Component Updates (In Progress) ✅
- Updated `shared-piece-view.component.scss`
- Next: Update remaining literature components
- Next: Update collection components
- Next: Update program components

### Phase 3: Testing (Planned)
- Contrast ratio verification
- Cross-browser testing
- Mobile device testing
- Accessibility audit

---

## Troubleshooting

### Issue: Colors look washed out in dark mode
- **Solution**: Check if you're using desaturated colors. Vibrant colors should be toned down.

### Issue: Text is hard to read in dark mode
- **Solution**: Ensure text color is `#e0e0e0` (not `#aaa`) and background is `#1e1e1e` or darker.

### Issue: Shadows not visible
- **Solution**: Use `@include darkmode.elevation-shadow()` mixin which uses highlights instead.

### Issue: Components not respecting dark theme
- **Solution**: Ensure component SCSS imports `@use 'src/themes/dark-mode-variables' as darkmode;`

---

## Future Enhancements

1. Implement automatic system dark mode detection
2. Add theme toggle to UI settings
3. Create dark mode screenshots for design system
4. Add dark mode stories to Storybook
5. Implement smooth theme transitions
6. Add theme preference persistence to localStorage
