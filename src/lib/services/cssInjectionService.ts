class CSSInjectionService {
  private injectedStyles: Map<string, HTMLStyleElement> = new Map();
  
  injectCSS(id: string, css: string): void {
    // Remove existing style if present
    this.removeCSS(id);
    
    const style = document.createElement('style');
    style.id = `theme-${id}`;
    style.textContent = css;
    
    document.head.appendChild(style);
    this.injectedStyles.set(id, style);
  }
  
  removeCSS(id: string): void {
    const existing = this.injectedStyles.get(id);
    if (existing) {
      existing.remove();
      this.injectedStyles.delete(id);
    }
  }
  
  injectThemeCSS(themeName: string, css: string): void {
    this.injectCSS(`theme-${themeName}`, css);
  }
  
  injectCustomCSS(userCSS: string): void {
    this.injectCSS('user-custom', userCSS);
  }
  
  removeAllCSS(): void {
    this.injectedStyles.forEach((style) => {
      style.remove();
    });
    this.injectedStyles.clear();
  }
  
  getInjectedCSS(id: string): string | null {
    const style = this.injectedStyles.get(id);
    return style ? style.textContent : null;
  }
  
  hasInjectedCSS(id: string): boolean {
    return this.injectedStyles.has(id);
  }
}

// Export singleton instance
export const cssInjectionService = new CSSInjectionService(); 