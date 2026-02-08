import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';
import { UserPreferencesService } from './user-preferences.service';

export type Theme = 'light' | 'dark' | 'system';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private renderer: Renderer2;
  private currentTheme: Theme = 'system';
  private static readonly STORAGE_KEY = 'theme';

  constructor(rendererFactory: RendererFactory2,
              private prefs: UserPreferencesService) {
    // Wir benötigen den Renderer, um Klassen sicher zum <body>-Tag hinzuzufügen.
    this.renderer = rendererFactory.createRenderer(null, null);
  }

  /**
   * Initialisiert das Theme beim Start der Anwendung.
   * Lädt die Benutzereinstellung aus dem gespeicherten Profil oder verwendet 'system' als Standard.
   */
  initializeTheme(): void {
    const localTheme = localStorage.getItem(ThemeService.STORAGE_KEY) as Theme | null;
    const storedTheme = this.prefs.getPreference('theme') as Theme | undefined;
    this.currentTheme = localTheme ?? storedTheme ?? 'system';
    localStorage.setItem(ThemeService.STORAGE_KEY, this.currentTheme);

    console.log(`[ThemeService] Theme wird initialisiert: "${this.currentTheme}"`);
    this.applyTheme(this.currentTheme);

    // Fügen Sie einen Listener hinzu, um auf Änderungen im System-Theme zu reagieren.
    // Dies ist nur relevant, wenn der Benutzer 'system' ausgewählt hat.
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (this.currentTheme === 'system') {
        console.log(`[ThemeService] System-Theme hat sich geändert: prefers-dark=${e.matches}`);
        this.applySystemTheme();
      }
    });
  }

  /**
   * Wendet das ausgewählte Theme an und speichert die Auswahl.
   * @param theme - Das anzuwendende Theme: 'light', 'dark' oder 'system'.
   */
  setTheme(theme: Theme): void {
    console.log(`[ThemeService] Benutzer wählt Theme: "${theme}"`);
    this.currentTheme = theme;
    localStorage.setItem(ThemeService.STORAGE_KEY, theme);
    this.prefs.update({ theme }).subscribe();
    this.applyTheme(theme);
  }

  /**
   * Gibt das aktuell ausgewählte Theme zurück.
   */
  getCurrentTheme(): Theme {
    return this.currentTheme;
  }

  /**
   * Interne Logik zur Anwendung des Themes.
   */
  private applyTheme(theme: Theme): void {
    if (theme === 'system') {
      console.log('[ThemeService] Theme "system" gewählt - Browser-Einstellung wird evaluiert');
      this.applySystemTheme();
    } else {
      console.log(`[ThemeService] Theme wird angewendet: "${theme}"`);
      this.updateBodyClass(theme);
    }
  }

  /**
   * Wendet das Theme basierend auf der Systemeinstellung an.
   */
  private applySystemTheme(): void {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const effectiveTheme = prefersDark ? 'dark' : 'light';
    console.log(`[ThemeService] System-Präferenz evaluiert: prefers-color-scheme=${prefersDark ? 'dark' : 'light'} → Angewendetes Theme: "${effectiveTheme}"`);
    this.updateBodyClass(effectiveTheme);
  }

  /**
   * Fügt die entsprechende CSS-Klasse zum <body>-Tag hinzu oder entfernt sie.
   * @param themeClass - 'light' oder 'dark'.
   */
  private updateBodyClass(themeClass: 'light' | 'dark'): void {
    const oppositeClass = themeClass === 'light' ? 'dark' : 'light';

    // Zuerst die entgegengesetzte Klasse entfernen
    this.renderer.removeClass(document.body, `${oppositeClass}-theme`);
    // Dann die gewünschte Klasse hinzufügen
    this.renderer.addClass(document.body, `${themeClass}-theme`);

    console.log(`[ThemeService] Body-Klasse gesetzt: "${themeClass}-theme" (entfernt: "${oppositeClass}-theme")`);
    console.log(`[ThemeService] Aktuelle Body-Klassen:`, document.body.className);
  }
}
