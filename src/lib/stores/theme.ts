import { writable } from 'svelte/store';
import { invoke } from '@tauri-apps/api/core';

// Create a writable store with the default accent color
export const accentColor = writable('#3b82f6');

// Create a writable store for the theme
export const theme = writable<'light' | 'dark' | 'system'>('system');

// Function to get the system theme preference
function getSystemTheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
}

// Function to apply theme to the DOM
function applyTheme(themeValue: 'light' | 'dark' | 'system') {
  if (typeof document === 'undefined') return;

  const resolvedTheme = themeValue === 'system' ? getSystemTheme() : themeValue;

  // Add or remove the dark class
  if (resolvedTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  // Keep the data attribute for compatibility
  document.documentElement.setAttribute('data-theme', resolvedTheme);
}

// Function to load the accent color from settings
export async function loadAccentColor() {
  try {
    const settings = await invoke<{ accent_color: string }>('get_settings');
    accentColor.set(settings.accent_color || '#3b82f6');
  } catch (e) {
    console.error('Failed to load accent color:', e);
  }
}

// Function to load the theme from settings
export async function loadTheme() {
  try {
    const settings = await invoke<{ theme: 'light' | 'dark' | 'system' }>('get_settings');
    const loadedTheme = settings.theme || 'system';
    theme.set(loadedTheme);
    applyTheme(loadedTheme);

    // Listen for system theme changes if using system theme
    if (loadedTheme === 'system' && typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleSystemThemeChange = () => {
        theme.update((currentTheme) => {
          if (currentTheme === 'system') {
            applyTheme('system');
          }
          return currentTheme;
        });
      };

      // Remove any existing listener first
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
      mediaQuery.addEventListener('change', handleSystemThemeChange);
    }
  } catch (e) {
    console.error('Failed to load theme:', e);
    // Fallback to system theme
    theme.set('system');
    applyTheme('system');
  }
}

// Function to update the accent color
export async function updateAccentColor(color: string) {
  try {
    const settings = await invoke<any>('get_settings');
    await invoke('save_settings', {
      newSettings: {
        ...settings,
        accent_color: color,
      },
    });
    accentColor.set(color);
  } catch (e) {
    console.error('Failed to update accent color:', e);
  }
}

// Function to update the theme
export async function updateTheme(newTheme: 'light' | 'dark' | 'system') {
  try {
    const settings = await invoke<any>('get_settings');
    await invoke('save_settings', {
      newSettings: {
        ...settings,
        theme: newTheme,
      },
    });
    theme.set(newTheme);
    applyTheme(newTheme);

    // Set up system theme listener if switching to system
    if (newTheme === 'system' && typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleSystemThemeChange = () => {
        theme.update((currentTheme) => {
          if (currentTheme === 'system') {
            applyTheme('system');
          }
          return currentTheme;
        });
      };

      // Remove any existing listener first
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
      mediaQuery.addEventListener('change', handleSystemThemeChange);
    }
  } catch (e) {
    console.error('Failed to update theme:', e);
  }
}

// Subscribe to theme changes and apply them
if (typeof window !== 'undefined') {
  theme.subscribe((themeValue) => {
    applyTheme(themeValue);
  });
}
