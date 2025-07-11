import { invoke } from '@tauri-apps/api/core';

export interface ThemeManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  compatibility: {
    minVersion: string;
    maxVersion: string;
  };
  preview: {
    thumbnail: string;
    screenshots: string[];
  };
  settings: {
    defaultAccentColor: string;
    defaultTheme: 'light' | 'dark' | 'system';
    supportsLightMode: boolean;
    supportsDarkMode: boolean;
    supportsSystemMode: boolean;
  };
  customProperties: Record<string, string>;
  fonts: {
    primary: string;
    secondary: string;
    monospace: string;
  };
  animations: {
    duration: string;
    easing: string;
    enableEnhanced: boolean;
  };
  features: {
    customScrollbars: boolean;
    glassmorphism: boolean;
    gradients: boolean;
    shadows: boolean;
  };
}

class ThemeService {
  private currentTheme: string = 'default';
  private loadedThemes: Map<string, ThemeManifest> = new Map();
  private activeCSSLinks: HTMLLinkElement[] = [];

  async loadTheme(themeName: string): Promise<void> {
    // If it's the default theme, remove all custom theme CSS
    if (themeName === 'default') {
      this.removeActiveCSS();
      this.currentTheme = 'default';
      return;
    }

    try {
      // Load theme manifest
      const manifest = await this.loadThemeManifest(themeName);
      
      // Load CSS files
      await this.loadThemeCSS(themeName, manifest);
      
      // Apply custom properties
      this.applyCustomProperties(manifest.customProperties);
      
      // Load fonts
      await this.loadThemeFonts(manifest.fonts);
      
      // Update current theme
      this.currentTheme = themeName;
      
      // Save to settings
      await this.saveThemePreference(themeName);
    } catch (error) {
      console.error('Failed to load theme:', error);
      // Fallback to default theme
      await this.loadTheme('default');
    }
  }

  async loadThemeManifest(themeName: string): Promise<ThemeManifest> {
    // For now, load from local themes directory
    const manifestPath = `/themes/${themeName}/theme-manifest.json`;
    
    try {
      const response = await fetch(manifestPath);
      if (!response.ok) {
        throw new Error(`Failed to load theme manifest: ${response.statusText}`);
      }
      
      const manifest: ThemeManifest = await response.json();
      this.loadedThemes.set(themeName, manifest);
      return manifest;
    } catch (error) {
      console.error('Error loading theme manifest:', error);
      throw error;
    }
  }

  async loadThemeCSS(themeName: string, manifest: ThemeManifest): Promise<void> {
    // Remove existing theme CSS
    this.removeActiveCSS();
    
    try {
      // Load global CSS
      await this.loadCSSFile(`/themes/${themeName}/styles/global.css`);
      
      // Load theme-specific CSS based on current mode
      const currentMode = this.getCurrentThemeMode();
      await this.loadCSSFile(`/themes/${themeName}/styles/${currentMode}.css`);
      
      // Load component CSS
      await this.loadCSSFile(`/themes/${themeName}/styles/components.css`);
    } catch (error) {
      console.warn('Some theme CSS files could not be loaded:', error);
    }
  }

  private async loadCSSFile(path: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = path;
      link.dataset.theme = 'true';
      
      link.onload = () => {
        this.activeCSSLinks.push(link);
        resolve();
      };
      
      link.onerror = () => {
        // Silently fail for missing CSS files
        resolve();
      };
      
      document.head.appendChild(link);
    });
  }

  private removeActiveCSS(): void {
    this.activeCSSLinks.forEach(link => {
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
    });
    this.activeCSSLinks = [];
  }

  private applyCustomProperties(properties: Record<string, string>): void {
    const root = document.documentElement;
    
    Object.entries(properties).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value);
    });
  }

  private async loadThemeFonts(fonts: ThemeManifest['fonts']): Promise<void> {
    // For now, just apply font family CSS variables
    const root = document.documentElement;
    root.style.setProperty('--font-primary', fonts.primary);
    root.style.setProperty('--font-secondary', fonts.secondary);
    root.style.setProperty('--font-monospace', fonts.monospace);
  }

  private getCurrentThemeMode(): string {
    // Get current theme mode from the theme store
    const html = document.documentElement;
    if (html.classList.contains('dark')) {
      return 'dark';
    } else {
      return 'light';
    }
  }

  private async saveThemePreference(themeName: string): Promise<void> {
    try {
      const settings = await invoke<any>('get_settings');
      await invoke('save_settings', {
        newSettings: {
          ...settings,
          current_theme: themeName,
        },
      });
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  }

  async getAvailableThemes(): Promise<string[]> {
    // For now, return built-in themes
    return ['default', 'sunset', 'light'];
  }

  async getCurrentTheme(): Promise<string> {
    return this.currentTheme;
  }

  async getThemeManifest(themeName: string): Promise<ThemeManifest | null> {
    if (this.loadedThemes.has(themeName)) {
      return this.loadedThemes.get(themeName)!;
    }
    
    try {
      return await this.loadThemeManifest(themeName);
    } catch (error) {
      return null;
    }
  }

  // Method to reset to default theme (no custom CSS)
  async resetToDefault(): Promise<void> {
    this.removeActiveCSS();
    this.currentTheme = 'default';
    
    // Clear any custom properties
    const root = document.documentElement;
    const customProperties = [
      'primaryColor', 'secondaryColor', 'successColor', 'warningColor', 'errorColor',
      'backgroundColor', 'surfaceColor', 'textColor', 'borderColor', 'shadowColor',
      'font-primary', 'font-secondary', 'font-monospace'
    ];
    
    customProperties.forEach(prop => {
      root.style.removeProperty(`--${prop}`);
    });
    
    await this.saveThemePreference('default');
  }

  public setCustomProperties(properties: Record<string, string>): void {
    this.applyCustomProperties(properties);
  }

  public setThemeFonts(fonts: ThemeManifest['fonts']): void {
    this.loadThemeFonts(fonts);
  }
}

// Export singleton instance
export const themeService = new ThemeService(); 