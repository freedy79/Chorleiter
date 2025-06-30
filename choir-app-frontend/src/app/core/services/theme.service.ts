import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';
import { UserPreferencesService } from './user-preferences.service';

export type Theme = 'light' | 'dark' | 'system';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private renderer: Renderer2;
  private currentTheme: Theme = 'system';

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
    const storedTheme = this.prefs.getPreference('theme') as Theme | undefined;
    this.currentTheme = storedTheme || 'system';
    this.applyTheme(this.currentTheme);

    // Fügen Sie einen Listener hinzu, um auf Änderungen im System-Theme zu reagieren.
    // Dies ist nur relevant, wenn der Benutzer 'system' ausgewählt hat.
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (this.currentTheme === 'system') {
        this.applySystemTheme();
      }
    });
  }

  /**
   * Wendet das ausgewählte Theme an und speichert die Auswahl.
   * @param theme - Das anzuwendende Theme: 'light', 'dark' oder 'system'.
   */
  setTheme(theme: Theme): void {
    this.currentTheme = theme;
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
      this.applySystemTheme();
    } else {
      this.updateBodyClass(theme);
    }
  }

  /**
   * Wendet das Theme basierend auf der Systemeinstellung an.
   */
  private applySystemTheme(): void {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.updateBodyClass(prefersDark ? 'dark' : 'light');
  }

  /**
   * Fügt die entsprechende CSS-Klasse zum <body>-Tag hinzu oder entfernt sie.
   * @param themeClass - 'light' oder 'dark'.
   */
  private updateBodyClass(themeClass: 'light' | 'dark'): void {
    const oppositeClass = themeClass === 'light' ? 'dark' : 'light';

    this.renderer.removeClass(document.body, `${oppositeClass}-theme`);
    this.renderer.addClass(document.body, `${themeClass}-theme`);
  }
}
